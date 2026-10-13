import { ApolloServer } from '@apollo/server';
import type { Context } from './context';
import { resolvers } from './resolvers';
import { typeDefs } from './typeDefs';

// Kept separate from index.ts so tests can build a server without opening a port.
export function createApolloServer(): ApolloServer<Context> {
  return new ApolloServer<Context>({ typeDefs, resolvers });
}
