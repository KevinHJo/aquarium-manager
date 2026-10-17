import assert from 'node:assert';
import type { Livestock } from '@prisma/client';
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

const MOVE_LIVESTOCK = `#graphql
  mutation MoveLivestock($input: MoveLivestockInput!) {
    moveLivestock(input: $input) { id name status createdAt species { id commonName } }
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

describe('move livestock', () => {
  let peanut: Livestock;
  let larryTankId2: string;
  beforeEach(async() => {
    peanut = await prisma.livestock.create({
      data: {
        name: 'Peanut',
        tankId: larryTankId,
        speciesId: Number(neonTetraId),
        livestockStays: { create: { tankId: larryTankId } }
      }
    });

    const larryTank2 = await prisma.tank.create({
      data: {
        ownerId: larryId,
        name: 'The Second Tank of Larry',
        volumeLiters: 300,
        waterType: 'SALTWATER',
      }
    })
    larryTankId2 = larryTank2.id
  });

  it('successfully moves livestock to a new tank', async() => {
    const input = { livestockId: peanut.id, newTankId: larryTankId2 }
    const result = await execute(MOVE_LIVESTOCK, { input }, larryId)
    const livestock = await prisma.livestock.findUnique({ where: { id: result.data?.moveLivestock?.id } })

    expect(result.errors).toBeUndefined();
    expect(livestock?.tankId).toBe(larryTankId2)
  })

  it('correctly updates livestock stays', async() => {
    const input1 = { livestockId: peanut.id, newTankId: larryTankId2 }
    const move1 = await execute(MOVE_LIVESTOCK, { input: input1 }, larryId)
    const input2 = { livestockId: peanut.id, newTankId: larryTankId }
    const move2 = await execute(MOVE_LIVESTOCK, { input: input2 }, larryId)
    const livestockStays = await prisma.livestockStay.findMany({
      where: { livestockId: peanut.id },
      orderBy: { startDate: 'asc' }
    })

    expect(move1.errors).toBeUndefined();
    expect(move2.errors).toBeUndefined();
    expect(livestockStays).toHaveLength(3);
    expect(livestockStays?.[0]).toMatchObject({ tankId: larryTankId, endDate: livestockStays?.[1]?.startDate });
    expect(livestockStays?.[1]).toMatchObject({ tankId: larryTankId2, endDate: livestockStays?.[2]?.startDate });
    expect(livestockStays?.[2]).toMatchObject({ tankId: larryTankId, endDate: null });
  })

  it('only allows users to move their own livestock to their own tanks', async() => {
    const larryGoodInput = { livestockId: peanut.id, newTankId: larryTankId2 }
    const larryBadInput = { livestockId: peanut.id, newTankId: bobTankId }
    const bobInput = { livestockId: peanut.id, newTankId: larryTankId2 }
    const larryMoveToLarry = await execute(MOVE_LIVESTOCK, { input: larryGoodInput }, larryId)
    const larryMoveToBob = await execute(MOVE_LIVESTOCK, { input: larryBadInput }, larryId)
    const bobMove = await execute(MOVE_LIVESTOCK, { input: bobInput }, bobId)

    expect(larryMoveToLarry.errors).toBeUndefined();
    expect(larryMoveToBob.errors?.[0]?.message).toBe('New tank not found.')
    expect(bobMove.errors?.[0]?.message).toBe('Livestock not found.')

    const dbPeanut = await prisma.livestock.findUnique({ where: { id: peanut.id } })
    expect(dbPeanut?.tankId).toBe(larryTankId2);

    const livestockStays = await prisma.livestockStay.findMany({ where: { livestockId: peanut.id } })
    expect(livestockStays).toHaveLength(2)
  })

  it('rejects a move if the fish does not exist', async() => {
    const input = { livestockId: crypto.randomUUID(), newTankId: peanut.tankId }
    const result = await execute(MOVE_LIVESTOCK, { input }, larryId)

    expect(result.errors?.[0]?.message).toBe('Livestock not found.')
  })

  it('rejects a move into the same tank', async() => {
    const input = { livestockId: peanut.id, newTankId: peanut.tankId }
    const result = await execute(MOVE_LIVESTOCK, { input }, larryId)

    expect(result.errors?.[0]?.message).toBe('Livestock is already in this tank.')

    const dbPeanut = await prisma.livestock.findUnique({ where: { id: peanut.id } })
    expect(dbPeanut?.tankId).toBe(larryTankId);

    const livestockStays = await prisma.livestockStay.findMany({ where: { livestockId: peanut.id } })
    expect(livestockStays).toHaveLength(1)
  })

  it('rejects a move into a tank that does not exist', async() => {
    const input = { livestockId: peanut.id, newTankId: crypto.randomUUID() }
    const result = await execute(MOVE_LIVESTOCK, { input }, larryId)

    expect(result.errors?.[0]?.message).toBe('New tank not found.')

    const dbPeanut = await prisma.livestock.findUnique({ where: { id: peanut.id } })
    expect(dbPeanut?.tankId).toBe(larryTankId);

    const livestockStays = await prisma.livestockStay.findMany({ where: { livestockId: peanut.id } })
    expect(livestockStays).toHaveLength(1)
  })

  it('rejects moving a deceased fish', async() => {
    const rip = await prisma.livestock.create({
      data: {
        name: 'RIP',
        tankId: larryTankId,
        status: 'DECEASED',
        speciesId: Number(neonTetraId),
        livestockStays: { create: { tankId: larryTankId } }
      }
    });
    const input = { livestockId: rip.id, newTankId: larryTankId2 }
    const result = await execute(MOVE_LIVESTOCK, { input }, larryId)

    expect(result.errors?.[0]?.message).toBe('Deceased or sold livestock cannot be moved.');
  })

  it('rejects moving a sold fish', async() => {
    const lata = await prisma.livestock.create({
      data: {
        name: 'BYE FELICIA',
        tankId: larryTankId,
        status: 'SOLD',
        speciesId: Number(neonTetraId),
        livestockStays: { create: { tankId: larryTankId } }
      }
    });
    const input = { livestockId: lata.id, newTankId: larryTankId2 }
    const result = await execute(MOVE_LIVESTOCK, { input }, larryId)

    expect(result.errors?.[0]?.message).toBe('Deceased or sold livestock cannot be moved.');
  })
});
