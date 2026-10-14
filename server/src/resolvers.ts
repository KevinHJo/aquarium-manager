import type { Livestock, LivestockStatus, Prisma, Tank, WaterType } from '@prisma/client';
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

function badInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

// GraphQL IDs arrive as strings, but Species ids are 32-bit integers in Postgres.
function parseSpeciesId(id: string): number | null {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647 ? parsed : null;
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

      const speciesId = parseSpeciesId(input.speciesId);
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
};
