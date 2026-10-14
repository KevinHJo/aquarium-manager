import type { Prisma, Tank, WaterType } from '@prisma/client';
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

function badInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
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
        },
      });
    },
  },

  // Field resolvers run when the database row and the GraphQL type differ.
  // Fields with matching names (name, volumeLiters, ...) resolve automatically.
  Tank: {
    createdAt: (tank: Tank) => tank.createdAt.toISOString(),
  },
};
