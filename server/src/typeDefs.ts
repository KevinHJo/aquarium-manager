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
    volumeLiters: Float!
    waterType: WaterType!
    hospital: Boolean
    notes: String
  }

  input CreateLivestockInput {
    tankId: ID!
    speciesId: ID!
    name: String
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
  }
`;
