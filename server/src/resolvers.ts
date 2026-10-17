import { Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';
import type { Context } from './context';
import type { Resolvers } from './generated/graphql';

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

export const resolvers: Resolvers = {
  Query: {
    tanks: (_parent, _args, { prisma, userId }) =>
      prisma.tank.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),

    // Filtering on ownerId as well as id is what stops one user reading another's tank.
    tank: (_parent, { id }, { prisma, userId }) =>
      prisma.tank.findFirst({ where: { id, ownerId: userId } }),

    species: (_parent, { search, waterType }, { prisma }) => {
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

    foods: async(_parent, { search, type }, { prisma, userId }) => {
      const where: Prisma.FoodWhereInput = { OR: [{ ownerId: null }, { ownerId: userId }] };
      where.AND = [];
      if (type) where.AND.push({ type: type}) ;
      if (search) where.AND.push({name: { contains: search, mode: 'insensitive' }})

      return await prisma.food.findMany({ where, orderBy: { name: 'asc' } });
    },

    food: async(_parent, { id }, { prisma, userId }) => {
      const foodId = parsePgIntId(id);
      if (foodId === null) return null;
      return await prisma.food.findFirst({ where: { id: foodId, OR: [{ ownerId: null }, { ownerId: userId }] } });
    },
  },

  Mutation: {
    createTank: (_parent, { input }, { prisma, userId }) => {
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
      _parent,
      { input },
      { prisma, userId },
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
    moveLivestock: async(_parent, { input }, { prisma, userId }) => {
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

    createFood: async(_parent, { input }, { prisma, userId }) => {
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
    createdAt: (tank) => tank.createdAt.toISOString(),

    // Only fish still in the tank. Dead and sold fish keep their rows for history.
    livestock: (tank, _args, { prisma }) =>
      prisma.livestock.findMany({
        where: { tankId: tank.id, status: { notIn: ['DECEASED', 'SOLD'] } },
        orderBy: { createdAt: 'asc' },
      }),
  },

  Livestock: {
    // Runs once per fish, so a tank of 20 fish makes 20 species queries (N+1). Optimize using DataLoader in future
    species: (livestock, _args, { prisma }) =>
      prisma.species.findUniqueOrThrow({ where: { id: livestock.speciesId } }),

    createdAt: (livestock) => livestock.createdAt.toISOString(),
  },

  Food: {
    // Runs once per food (N+1). Optimize using DataLoader in future
    isCustom: (food) => food.ownerId !== null,
    // findMany always returns a list, which matches the non-null [Species!]! in the schema.
    unsafeFor: (food, _args, { prisma }) =>
      prisma.species.findMany({ where: { unsafeFoods: { some: { id: food.id } } } }),
  },
};
