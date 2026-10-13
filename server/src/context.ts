import type { PrismaClient } from '@prisma/client';

// Built once per request and passed to every resolver as the third argument.
export interface Context {
  prisma: PrismaClient;
  // The signed-in user. Until OAuth is added this is always the dev user.
  userId: string;
}
