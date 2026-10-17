import { createApolloServer } from '../src/server';
import assert from 'node:assert';
import { prisma } from '../src/db';

const server = createApolloServer();

export async function execute(query: string, variables: Record<string, unknown>, userId: string) {
  const response = await server.executeOperation<Record<string, any>>(
    { query, variables },
    { contextValue: { prisma, userId } },
  );
  assert(response.body.kind === 'single');
  return response.body.singleResult;
}

export async function createVeggies() {
  // Deleting users cascades to their foods.
  await prisma.user.deleteMany();
  const larry = await prisma.user.create({ data: { email: 'larry@example.com' } });
  const bob = await prisma.user.create({ data: { email: 'bob@example.com' } });

  return { bob, larry }
}
