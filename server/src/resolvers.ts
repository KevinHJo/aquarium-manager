import { Prisma } from '@prisma/client';
import type {
  Food,
  FoodType,
  FeedingSchedule,
  FeedingLog,
  Livestock,
  LivestockStatus,
  Tank,
  WaterType
} from '@prisma/client';
import { GraphQLError } from 'graphql';
import type { Context } from './context';

// Argument types are written by hand for now and must be kept in step with
// typeDefs.ts. GraphQL Code Generator will replace them later.
interface TankArgs {
  id: string;
}

interface SpeciesArgs {
  search?: string | null;
  waterType?: WaterType | null;
}

interface CreateTankArgs {
  input: {
    name: string;
    hospital?: boolean | null;
    volumeLiters: number;
    waterType: WaterType;
    notes?: string | null;
  };
}

interface CreateLivestockArgs {
  input: {
    name?: string | null;
    tankId: string;
    speciesId: string;
    status?: LivestockStatus | null;
  }
}
interface MoveLivestockArgs {
  input: {
    livestockId: string;
    newTankId: string;
  }
}

interface FoodsArgs {
  search?: string | null;
  type?: FoodType | null;
}

interface FoodArgs {
  id: string;
}

interface CreateFoodArgs {
  input: {
    name: string;
    type: FoodType;
    unsafeForSpeciesIds?: string[] | null;
  }
}

interface CreateFeedingScheduleArgs {
  input: {
    tankId: string;
    foodId: string;
    feedingAmount: number;
    feedingUnit: string;
    startDate: string;
    endDate?: string | null;
    timesPerDay: number;
    intervalDays: number;
  }
}

interface CreateFeedingLogArgs {
  input: {
    scheduleId: string;
    fedAt?: string | null;
    notes?: string | null;
  }
}

function badInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

// GraphQL IDs arrive as strings, but Integer ids are 32-bit integers in Postgres.
function parsePgIntId(id: string): number | null {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647 ? parsed : null;
}

async function checkSpeciesIds(ids: string[] | null | undefined, prisma: Context['prisma']) {
  const speciesIds: number[] = []
  for (const raw of ids ?? []) {
    const id = parsePgIntId(raw);
    if (id === null) throw badInput('Species not found.');
    speciesIds.push(id);
  }

  const uniqueIds = [...new Set(speciesIds)];
  const found = await prisma.species.count({ where: { id: { in: uniqueIds } } });
  if (found !== uniqueIds.length) throw badInput('Species not found.');

  return uniqueIds
}

export const resolvers = {
  Query: {
    tanks: (_parent: unknown, _args: unknown, { prisma, userId }: Context) =>
      prisma.tank.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),

    // Filtering on ownerId as well as id is what stops one user reading another's tank.
    tank: (_parent: unknown, { id }: TankArgs, { prisma, userId }: Context) =>
      prisma.tank.findFirst({ where: { id, ownerId: userId } }),

    species: (_parent: unknown, { search, waterType }: SpeciesArgs, { prisma }: Context) => {
      const where: Prisma.SpeciesWhereInput = {};
      if (waterType) where.waterType = waterType;
      if (search) {
        where.OR = [
          { commonName: { contains: search, mode: 'insensitive' } },
          { scientificName: { contains: search, mode: 'insensitive' } },
        ];
      }
      return prisma.species.findMany({ where, orderBy: { commonName: 'asc' } });
    },

    foods: async(_parent: unknown, { search, type }: FoodsArgs, { prisma, userId }: Context) => {
      const where: Prisma.FoodWhereInput = { OR: [{ ownerId: null }, { ownerId: userId }] };
      where.AND = [];
      if (type) where.AND.push({ type: type}) ;
      if (search) where.AND.push({name: { contains: search, mode: 'insensitive' }})

      return await prisma.food.findMany({ where, orderBy: { name: 'asc' } });
    },

    food: async(_parent: unknown, { id }: FoodArgs, { prisma, userId }: Context) => {
      const foodId = parsePgIntId(id);
      if (foodId === null) return null;
      return await prisma.food.findFirst({ where: { id: foodId, OR: [{ ownerId: null }, { ownerId: userId }] } });
    },
  },

  Mutation: {
    createTank: (_parent: unknown, { input }: CreateTankArgs, { prisma, userId }: Context) => {
      const name = input.name.trim();
      if (name === '') throw badInput('Tank name is required.');
      if (input.volumeLiters <= 0) throw badInput('Tank volume must be greater than zero.');

      return prisma.tank.create({
        data: {
          ownerId: userId,
          name,
          hospital: input.hospital ?? false,
          volumeLiters: input.volumeLiters,
          waterType: input.waterType,
          notes: input.notes ?? null,
        }
      });
    },
    createLivestock: async (
      _parent: unknown,
      { input }: CreateLivestockArgs,
      { prisma, userId }: Context,
    ) => {
      let name = input.name?.trim();
      name = name === '' ? undefined : name;

      // Same message for "no such tank" and "someone else's tank", so ids can't be probed.
      const tank = await prisma.tank.findFirst({ where: { id: input.tankId, ownerId: userId } });
      if (!tank) throw badInput('Tank not found.');

      const speciesId = parsePgIntId(input.speciesId);
      const species = speciesId === null ? null : await prisma.species.findUnique({ where: { id: speciesId } });
      if (!species) throw badInput('Species not found.');

      // The nested create inserts the first stay in the same transaction as the livestock row.
      return prisma.livestock.create({
        data: {
          name: name ?? null,
          tankId: tank.id,
          speciesId: species.id,
          status: input.status ?? 'HEALTHY',
          livestockStays: { create: { tankId: tank.id } },
        },
      });
    },
    moveLivestock: async(_parent: unknown, { input }: MoveLivestockArgs, { prisma, userId }: Context) => {
      const livestock = await prisma.livestock.findFirst({
        where: { id: input.livestockId, tank: { ownerId: userId } }
      });
      if (!livestock) throw badInput('Livestock not found.');
      if (livestock.tankId === input.newTankId) throw badInput('Livestock is already in this tank.')
      if (livestock.status === 'DECEASED' || livestock.status === 'SOLD') {
        throw badInput('Deceased or sold livestock cannot be moved.')
      }

      const newTank = await prisma.tank.findUnique({ where: { id: input.newTankId } })
      if (!newTank || newTank.ownerId !== userId) throw badInput('New tank not found.')

      const now = new Date();
      const [, , moved] = await prisma.$transaction([
        prisma.livestockStay.updateMany({
          where: { livestockId: livestock.id, endDate: null},
          data: { endDate: now }
        }),
        prisma.livestockStay.create({
          data: { livestockId: livestock.id, tankId: input.newTankId, startDate: now }
        }),
        prisma.livestock.update({
          where: { id: livestock.id },
          data: { tankId: input.newTankId}
        })
      ]);

      return moved
    },

    createFood: async(_parent: unknown, { input }: CreateFoodArgs, { prisma, userId }: Context) => {
      const name = input.name.trim();
      if (name === '') throw badInput('Food name is required.');

      const speciesIds = await checkSpeciesIds(input.unsafeForSpeciesIds, prisma)

      try {
        return await prisma.food.create({
          data: {
            ownerId: userId,
            name,
            type: input.type,
            unsafeFor: { connect: speciesIds.map((id) => ({ id })) }
          }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw badInput('You already have a food with this name.');
        }
        throw error;
      }
    }
  },

  // Field resolvers run when the database row and the GraphQL type differ.
  // Fields with matching names (name, volumeLiters, ...) resolve automatically.
  Tank: {
    createdAt: (tank: Tank) => tank.createdAt.toISOString(),

    // Only fish still in the tank. Dead and sold fish keep their rows for history.
    livestock: (tank: Tank, _args: unknown, { prisma }: Context) =>
      prisma.livestock.findMany({
        where: { tankId: tank.id, status: { notIn: ['DECEASED', 'SOLD'] } },
        orderBy: { createdAt: 'asc' },
      }),
  },

  Livestock: {
    // Runs once per fish, so a tank of 20 fish makes 20 species queries (N+1). Optimize using DataLoader in future
    species: (livestock: Livestock, _args: unknown, { prisma }: Context) =>
      prisma.species.findUniqueOrThrow({ where: { id: livestock.speciesId } }),

    createdAt: (livestock: Livestock) => livestock.createdAt.toISOString(),
  },

  Food: {
    // Runs once per food (N+1). Optimize using DataLoader in future
    isCustom: (food: Food) => food.ownerId !== null,
    unsafeFor: (food: Food, _args: unknown, { prisma }: Context) => {
      return prisma.food.findUnique({ where: { id: food.id } }).unsafeFor()
    }
  },
};
