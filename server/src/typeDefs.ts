import { readFileSync } from 'node:fs';

// The schema lives in schema.graphql so GraphQL Code Generator can read it too.
// Run `npm run codegen` after changing it.
export const typeDefs = readFileSync(new URL('./schema.graphql', import.meta.url), 'utf8');
