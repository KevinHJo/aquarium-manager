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

const CREATE_TANK = `#graphql
  mutation CreateTank($input: CreateTankInput!) {
    createTank(input: $input) { id name hospital volumeLiters waterType createdAt }
  }
`;

const TANKS = `#graphql
  query Tanks { tanks { id name } }
`;

const TANK = `#graphql
  query Tank($id: ID!) { tank(id: $id) { id name } }
`;

let larryId: string;
let bobId: string;

beforeEach(async() => {
  // Deleting users cascades to their tanks.
  await prisma.user.deleteMany();
  const larry = await prisma.user.create({ data: { email: 'larry@example.com' } });
  const bob = await prisma.user.create({ data: { email: 'bob@example.com' } });
  larryId = larry.id;
  bobId = bob.id;
});

afterAll(async() => {
  await prisma.$disconnect();
});

describe('createTank', () => {
  it('creates a tank owned by the current user', async() => {
    const input = { name: '  Community tank ', volumeLiters: 120, waterType: 'FRESHWATER' };
    const result = await execute(CREATE_TANK, { input }, larryId);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createTank).toMatchObject({
      name: 'Community tank',
      volumeLiters: 120,
      waterType: 'FRESHWATER',
    });

    const saved = await prisma.tank.findUniqueOrThrow({ where: { id: result.data?.createTank.id } });
    expect(saved.ownerId).toBe(larryId);
  });

  it('creates a tank that is not a hospital by default', async() => {
    const input = { name: 'Healthy Happy', volumeLiters: 120, waterType: 'SALTWATER'};
    const result = await execute(CREATE_TANK, { input }, larryId);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createTank).toMatchObject({
      name: 'Healthy Happy',
      hospital: false,
      volumeLiters: 120,
      waterType: 'SALTWATER',
    });

    const saved = await prisma.tank.findUniqueOrThrow({ where: { id: result.data?.createTank.id } });
    expect(saved.ownerId).toBe(larryId)
  })

  it('creates a hospital tank when hospital is defined as true', async() => {
    const input = { name: 'Sick Sad', hospital: true, volumeLiters: 120, waterType: 'SALTWATER'};
    const result = await execute(CREATE_TANK, { input }, bobId);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createTank).toMatchObject({
      name: 'Sick Sad',
      hospital: true,
      volumeLiters: 120,
      waterType: 'SALTWATER',
    });

    const saved = await prisma.tank.findUniqueOrThrow({ where: { id: result.data?.createTank.id } });
    expect(saved.ownerId).toBe(bobId)
  })

  it('creates a healthy tank when hospital is defined as false', async() => {
    const input = { name: 'Definitely Healthy Happy', hospital: false, volumeLiters: 120, waterType: 'SALTWATER'};
    const result = await execute(CREATE_TANK, { input }, larryId);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createTank).toMatchObject({
      name: 'Definitely Healthy Happy',
      hospital: false,
      volumeLiters: 120,
      waterType: 'SALTWATER',
    });

    const saved = await prisma.tank.findUniqueOrThrow({ where: { id: result.data?.createTank.id } });
    expect(saved.ownerId).toBe(larryId)
  })

  it('creates a healthy tank when hospital is defined as null', async() => {
    const input = { name: 'Healthy I think?', hospital: null, volumeLiters: 120, waterType: 'SALTWATER'};
    const result = await execute(CREATE_TANK, { input }, larryId);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createTank).toMatchObject({
      name: 'Healthy I think?',
      hospital: false,
      volumeLiters: 120,
      waterType: 'SALTWATER',
    });

    const saved = await prisma.tank.findUniqueOrThrow({ where: { id: result.data?.createTank.id } });
    expect(saved.ownerId).toBe(larryId)
  })

  it('rejects a volume of zero', async() => {
    const input = { name: 'Nano', volumeLiters: 0, waterType: 'FRESHWATER' };
    const result = await execute(CREATE_TANK, { input }, larryId);

    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(result.errors?.[0]?.message).toBe('Tank volume must be greater than zero.')
    expect(await prisma.tank.count()).toBe(0);
  });

  it('rejects a negative volume', async() => {
    const input = { name: 'Super Nano', volumeLiters: -120, waterType: 'SALTWATER' }
    const result = await execute(CREATE_TANK, { input }, bobId);

    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(result.errors?.[0]?.message).toBe('Tank volume must be greater than zero.')
    expect(await prisma.tank.count()).toBe(0);
  });

  it('rejects an empty string as a name', async() => {
    const input = { name: '', volumeLiters: 120, waterType: 'SALTWATER' };
    const result = await execute(CREATE_TANK, { input }, larryId);

    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(result.errors?.[0]?.message).toBe('Tank name is required.')
    expect(await prisma.tank.count()).toBe(0);
  });

  it('rejects a string of only spaces as a name', async() => {
    const input = { name: '  ', volumeLiters: 120, waterType: 'SALTWATER' };
    const result = await execute(CREATE_TANK, { input }, larryId);

    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(result.errors?.[0]?.message).toBe('Tank name is required.')
    expect(await prisma.tank.count()).toBe(0);
  });
});

describe('tank queries', () => {
  it('only returns a list of tanks belonging to the current user', async() => {
    const reef = { name: 'Reef', volumeLiters: 300, waterType: 'SALTWATER' };
    const planted = { name: 'Planted', volumeLiters: 100, waterType: 'FRESHWATER' };
    const savedReef = await execute(CREATE_TANK, { input: reef }, larryId);
    const savedPlanted = await execute(CREATE_TANK, { input: planted }, larryId);
    const reefId: string = savedReef.data?.createTank.id;
    const plantedId: string = savedPlanted.data?.createTank.id;

    const larryList = await execute(TANKS, {}, larryId);
    expect(larryList.data?.tanks).toEqual([{ id: reefId, name: 'Reef' }, { id: plantedId, name: 'Planted' }]);

    const bobList = await execute(TANKS, {}, bobId);
    expect(bobList.data?.tanks).toEqual([]);

    const bobLookup = await execute(TANK, { id: reefId }, bobId);
    expect(bobLookup.data?.tank).toBeNull();
  });

  it('only returns a tank queried by id when it is owned by the current user', async() => {
    const reef = { name: 'Reef', volumeLiters: 300, waterType: 'SALTWATER' };
    const savedReef = await execute(CREATE_TANK, { input: reef }, larryId);
    const reefId: string = savedReef.data?.createTank.id;

    const larryLookup = await execute(TANK, { id: reefId }, larryId);
    expect(larryLookup.data?.tank).toEqual({ id: reefId, name: 'Reef' });
  });

  it('returns null if searching for a tank id that does not exist', async() => {
    const result = await execute(TANK, { id: crypto.randomUUID() }, larryId);
    expect(result.errors).toBe(undefined)
    expect(result.data?.tank).toBeNull();
  })

  it('orders a returned tank list oldest to youngest', async() => {
    const newer = await prisma.tank.create({
      data: {
        ownerId: larryId,
        name: 'Second',
        volumeLiters: 120,
        waterType: 'FRESHWATER',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
    });
    const older = await prisma.tank.create({
      data: {
        ownerId: larryId,
        name: 'First',
        volumeLiters: 120,
        waterType: 'SALTWATER',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    });

    const result = await execute(TANKS, {}, larryId);
    const ids = result.data?.tanks.map((tank: { id: string }) => tank.id);
    expect(ids).toEqual([older.id, newer.id]);
  })
});
