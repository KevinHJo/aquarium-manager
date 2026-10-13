import { startStandaloneServer } from '@apollo/server/standalone';
import type { Context } from './context';
import { prisma } from './db';
import { createApolloServer } from './server';

const port = Number(process.env.PORT ?? 4000);

// Stand-in for authentication: every request runs as this user until OAuth is added.
const devUser = await prisma.user.upsert({
  where: { email: 'dev@example.com' },
  update: {},
  create: { email: 'dev@example.com', name: 'Dev User' },
});

const { url } = await startStandaloneServer(createApolloServer(), {
  listen: { port },
  context: async (): Promise<Context> => ({ prisma, userId: devUser.id }),
});

console.log(`GraphQL API ready at ${url}`);
