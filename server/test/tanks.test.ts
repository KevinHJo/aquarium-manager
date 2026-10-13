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
    createTank(input: $input) { id name volumeLiters waterType createdAt }
  }
`;

const TANKS = `#graphql
  query Tanks { tanks { id name } }
`;

const TANK = `#graphql
  query Tank($id: ID!) { tank(id: $id) { id name } }
`;

let aliceId: string;
let bobId: string;

beforeEach(async () => {
  // Deleting users cascades to their tanks.
  await prisma.user.deleteMany();
  const alice = await prisma.user.create({ data: { email: 'alice@example.com' } });
  const bob = await prisma.user.create({ data: { email: 'bob@example.com' } });
  aliceId = alice.id;
  bobId = bob.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createTank', () => {
  it('creates a tank owned by the current user', async () => {
    const input = { name: '  Community tank ', volumeLiters: 120, waterType: 'FRESHWATER' };
    const result = await execute(CREATE_TANK, { input }, aliceId);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createTank).toMatchObject({
      name: 'Community tank',
      volumeLiters: 120,
      waterType: 'FRESHWATER',
    });

    const saved = await prisma.tank.findUniqueOrThrow({ where: { id: result.data?.createTank.id } });
    expect(saved.ownerId).toBe(aliceId);
  });

  it('rejects a volume of zero or less', async () => {
    const input = { name: 'Nano', volumeLiters: 0, waterType: 'FRESHWATER' };
    const result = await execute(CREATE_TANK, { input }, aliceId);

    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
    expect(await prisma.tank.count()).toBe(0);
  });
});

describe('tank queries', () => {
  it("only return the current user's tanks", async () => {
    const reef = { name: 'Reef', volumeLiters: 300, waterType: 'SALTWATER' };
    const created = await execute(CREATE_TANK, { input: reef }, aliceId);
    const reefId: string = created.data?.createTank.id;

    const aliceList = await execute(TANKS, {}, aliceId);
    expect(aliceList.data?.tanks).toEqual([{ id: reefId, name: 'Reef' }]);

    const bobList = await execute(TANKS, {}, bobId);
    expect(bobList.data?.tanks).toEqual([]);

    const bobLookup = await execute(TANK, { id: reefId }, bobId);
    expect(bobLookup.data?.tank).toBeNull();
  });
});
