import assert from 'node:assert';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { createApolloServer } from '../src/server';

const server = createApolloServer();

// Runs an operation as the given user, without going over HTTP.
async function execute(query: string, variables: Record<string, unknown>, userId: string) {
  const response = await server.executeOperation<Record<string, any>>(
    { query, variables },
    { contextValue: { prisma, userId } },
  );
  assert(response.body.kind === 'single');
  return response.body.singleResult;
}

const CREATE_LIVESTOCK = `#graphql
  mutation CreateLivestock($input: CreateLivestockInput!) {
    createLivestock(input: $input) { id name status createdAt species { id commonName } }
  }
`;

const TANK_LIVESTOCK = `#graphql
  query TankLivestock($tankId: ID!) {
    tank(id: $tankId) {
      livestock { id name status createdAt species { id commonName } }
    }
  }
`;

let neonTetraId: string;
let larryId: string;
let bobId: string;
let larryTankId: string;
let bobTankId: string;

beforeEach(async() => {
  await prisma.user.deleteMany();
  await prisma.species.deleteMany();

  const neonTetra = await prisma.species.create({
    data: {
      scientificName: 'Paracheirodon innesi',
      commonName: 'Neon tetra',
      waterType: 'FRESHWATER',
      temperament: 'PEACEFUL',
      minTankLiters: 40,
      adultSizeCm: 3,
      phMin: 6,
      phMax: 7,
      tempMinC: 20,
      tempMaxC: 26,
    },
  });
  neonTetraId = String(neonTetra.id);

  const larry = await prisma.user.create({ data: { email: 'larry@example.com' } });
  const bob = await prisma.user.create({ data: { email: 'bob@example.com' } });
  larryId = larry.id;
  bobId = bob.id;

  const larryTank = await prisma.tank.create({ data: {
    ownerId: larryId,
    name: 'The Tank of Larry',
    volumeLiters: 120,
    waterType: 'FRESHWATER',
  }})
  const bobTank = await prisma.tank.create({ data: {
    ownerId: bobId,
    name: 'The Tank of Bob',
    volumeLiters: 120,
    waterType: 'SALTWATER',
  }})
  larryTankId = larryTank.id;
  bobTankId = bobTank.id;
});

afterAll(async() => {
  await prisma.$disconnect();
});

describe('create livestock', () => {
  it('only creates a livestock for tanks owned by the current user', async() => {
    const larryInput = { tankId: larryTankId, speciesId: neonTetraId }
    const bobInput = { tankId: bobTankId, speciesId: neonTetraId }
    const larrysFish = await execute(CREATE_LIVESTOCK, { input: larryInput }, larryId)
    const bobsFish = await execute(CREATE_LIVESTOCK, { input: bobInput }, larryId)

    expect(larrysFish.errors).toBeUndefined();
    expect(bobsFish.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
    expect(bobsFish.errors?.[0]?.message).toBe('Tank not found.')
    expect(larrysFish.data?.createLivestock).toMatchObject({ name: null, status: 'HEALTHY'})

    const count = await prisma.livestock.count();
    expect(count).toBe(1);

    const saved = await prisma.livestock.findUniqueOrThrow({ where: { id: larrysFish.data?.createLivestock.id } });
    expect(saved.tankId).toBe(larryTankId)
  })

  it('creates a livestock when name is provided', async() => {
    const input = { name: 'Peanut', tankId: larryTankId, speciesId: neonTetraId }
    const fish = await execute(CREATE_LIVESTOCK, { input }, larryId)

    expect(fish.errors).toBeUndefined();
    expect(fish.data?.createLivestock).toMatchObject({ name: 'Peanut', status: 'HEALTHY'})
  })

  it('creates a livestock when name is not provided', async() => {
    const input = { tankId: larryTankId, speciesId: neonTetraId }
    const fish = await execute(CREATE_LIVESTOCK, { input }, larryId)

    expect(fish.errors).toBeUndefined();
    expect(fish.data?.createLivestock).toMatchObject({ name: null, status: 'HEALTHY'})
  })

  it('creates a livestock with no name when the name is provided as a string of spaces', async() => {
    const input = { name: '  ', tankId: larryTankId, speciesId: neonTetraId }
    const fish = await execute(CREATE_LIVESTOCK, { input }, larryId)

    expect(fish.errors).toBeUndefined();
    expect(fish.data?.createLivestock).toMatchObject({ name: null, status: 'HEALTHY'})
  })

  it('creates a livestock with the given status', async() => {
    const healthyInput = { tankId: larryTankId, speciesId: neonTetraId, status: 'HEALTHY' }
    const sickInput = { tankId: larryTankId, speciesId: neonTetraId, status: 'SICK' }
    const deceasedInput = { tankId: larryTankId, speciesId: neonTetraId, status: 'DECEASED' }
    const soldInput = { tankId: larryTankId, speciesId: neonTetraId, status: 'SOLD' }

    const healthyFish = await execute(CREATE_LIVESTOCK, { input: healthyInput }, larryId)
    const sickFish = await execute(CREATE_LIVESTOCK, { input: sickInput }, larryId)
    const deceasedFish = await execute(CREATE_LIVESTOCK, { input: deceasedInput }, larryId)
    const soldFish = await execute(CREATE_LIVESTOCK, { input: soldInput }, larryId)

    expect(healthyFish.errors).toBeUndefined();
    expect(sickFish.errors).toBeUndefined();
    expect(deceasedFish.errors).toBeUndefined();
    expect(soldFish.errors).toBeUndefined();
    expect(healthyFish.data?.createLivestock).toMatchObject({ status: 'HEALTHY' })
    expect(sickFish.data?.createLivestock).toMatchObject({ status: 'SICK' })
    expect(deceasedFish.data?.createLivestock).toMatchObject({ status: 'DECEASED' })
    expect(soldFish.data?.createLivestock).toMatchObject({ status: 'SOLD' })
  })

  it('creates a livestock with an open stay', async() => {
    const input = { tankId: larryTankId, speciesId: neonTetraId }
    const fish = await execute(CREATE_LIVESTOCK, { input }, larryId)
    const id = fish.data?.createLivestock.id

    expect(fish.errors).toBeUndefined();
    const saved = await prisma.livestockStay.findMany({ where: { livestockId: id } })

    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ tankId: larryTankId, livestockId: id })
    expect(saved[0]?.endDate).toBeNull();
  });

  it('returns an error if given a tank ID that does not exist', async() => {
    const input = { tankId: crypto.randomUUID(), speciesId: neonTetraId }
    const result = await execute(CREATE_LIVESTOCK, { input }, larryId)

    const count = await prisma.livestock.count()
    expect(count).toBe(0)

    expect(result.errors?.[0]?.message).toBe('Tank not found.')
  })

  it('returns an error if species ID is invalid', async() => {
    const input1 = { tankId: larryTankId, speciesId: 0 }
    const result1 = await execute(CREATE_LIVESTOCK, { input: input1 }, larryId)
    const input2 = { tankId: larryTankId, speciesId: 2147483648 }
    const result2 = await execute(CREATE_LIVESTOCK, { input: input2 }, larryId)
    const input3 = { tankId: larryTankId, speciesId: 'hello' }
    const result3 = await execute(CREATE_LIVESTOCK, { input: input3 }, larryId)
    const input4 = { tankId: larryTankId, speciesId: String(Number(neonTetraId) + 1) }
    const result4 = await execute(CREATE_LIVESTOCK, { input: input4 }, larryId)

    const count = await prisma.livestock.count()
    expect(count).toBe(0)

    expect(result1.errors?.[0]?.message).toBe('Species not found.')
    expect(result2.errors?.[0]?.message).toBe('Species not found.')
    expect(result3.errors?.[0]?.message).toBe('Species not found.')
    expect(result4.errors?.[0]?.message).toBe('Species not found.')
  })
});

describe('livestock queries', () => {
    it('only returns healthy and sick livestock in a tank', async() => {
      const healthyFish = await prisma.livestock.create({
        data: {
          tankId: larryTankId,
          speciesId: Number(neonTetraId),
          status: 'HEALTHY',
          livestockStays: { create: { tankId: larryTankId } }
        }
      });
      const sickFish = await prisma.livestock.create({
        data: {
          tankId: larryTankId,
          speciesId: Number(neonTetraId),
          status: 'SICK',
          livestockStays: { create: { tankId: larryTankId } }
        }
      });
      const deceasedFish = await prisma.livestock.create({
        data: {
          tankId: larryTankId,
          speciesId: Number(neonTetraId),
          status: 'DECEASED',
          livestockStays: { create: { tankId: larryTankId } }
        }
      });
      const soldFish = await prisma.livestock.create({
        data: {
          tankId: larryTankId,
          speciesId: Number(neonTetraId),
          status: 'SOLD',
          livestockStays: { create: { tankId: larryTankId } }
        }
      });

      const result = await execute(TANK_LIVESTOCK, { tankId: larryTankId}, larryId)
      const ids = result.data?.tank?.livestock.map( (fish: { id: string }) => fish.id)

      expect(ids).toContain(healthyFish.id)
      expect(ids).toContain(sickFish.id)
      expect(ids).not.toContain(deceasedFish.id)
      expect(ids).not.toContain(soldFish.id)
    });

    it('returns the correct species associated with the livestock', async() => {
      const input = { tankId: larryTankId, speciesId: neonTetraId }
      const result = await execute(CREATE_LIVESTOCK, { input }, larryId)

      expect(result.data?.createLivestock?.species?.commonName).toBe('Neon tetra')
    })
});
