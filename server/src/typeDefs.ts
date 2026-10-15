export const typeDefs = `#graphql
  enum WaterType {
    FRESHWATER
    BRACKISH
    SALTWATER
  }

  enum Temperament {
    PEACEFUL
    SEMI_AGGRESSIVE
    AGGRESSIVE
  }

  enum LivestockStatus {
    HEALTHY
    SICK
    DECEASED
    SOLD
  }

  enum FoodType {
    FROZEN
    FLAKE
    PELLET
    LIVE
    OTHER
  }

  enum DoseUnit {
    ML
    DROPS
    GRAMS
    TABLETS
  }

  enum MaintenanceType {
    WATER_CHANGE
    GLASS_CLEANING
    GRAVEL_VACUUM
    FILTER_CLEANING
    PROTEIN_SKIMMER_CLEANING
    FILTER_CHANGE
    OTHER
  }

  type Tank {
    id: ID!
    name: String!
    volumeLiters: Float!
    waterType: WaterType!
    hospital: Boolean!
    notes: String
    livestock: [Livestock!]!
    "ISO 8601 timestamp"
    createdAt: String!
  }

  type Livestock {
    id: ID!
    name: String
    species: Species!
    status: LivestockStatus!
    "ISO 8601 timestamp"
    createdAt: String!
  }

  type Species {
    id: ID!
    scientificName: String!
    commonName: String!
    waterType: WaterType!
    temperament: Temperament!
    minTankLiters: Int!
    adultSizeCm: Float!
    phMin: Float!
    phMax: Float!
    tempMinC: Float!
    tempMaxC: Float!
  }

  input CreateTankInput {
    name: String!
    hospital: Boolean
    volumeLiters: Float!
    waterType: WaterType!
    notes: String
  }

  input CreateLivestockInput {
    name: String
    tankId: ID!
    speciesId: ID!
    status: LivestockStatus
  }

  input MoveLivestockInput {
    livestockId: ID!
    newTankId: ID!
  }

  type Query {
    "The current user's tanks, oldest first."
    tanks: [Tank!]!
    "One of the current user's tanks, or null if it doesn't exist or isn't theirs."
    tank(id: ID!): Tank
    "The species catalog, optionally filtered by name and water type."
    species(search: String, waterType: WaterType): [Species!]!
  }

  type Mutation {
    createTank(input: CreateTankInput!): Tank!
    createLivestock(input: CreateLivestockInput!): Livestock!
    moveLivestock(input: MoveLivestockInput!): Livestock!
  }
`;
