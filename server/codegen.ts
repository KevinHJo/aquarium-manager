import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/schema.graphql',
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        // Every resolver receives our Context as its third argument.
        contextType: '../context#Context',
        useTypeImports: true,
        // Generate enums as string unions so they line up with Prisma's enums.
        enumsAsTypes: true,
        // The parent of a field resolver is the Prisma row the resolver above returned,
        // not the GraphQL type. Mappers tell codegen which Prisma model that is.
        mappers: {
          Tank: '@prisma/client#Tank as TankModel',
          Livestock: '@prisma/client#Livestock as LivestockModel',
          Species: '@prisma/client#Species as SpeciesModel',
          Food: '@prisma/client#Food as FoodModel',
          FeedingSchedule: '@prisma/client#FeedingSchedule as FeedingScheduleModel',
          FeedingLog: '@prisma/client#FeedingLog as FeedingLogModel',
        },
      },
    },
  },
};

export default config;
