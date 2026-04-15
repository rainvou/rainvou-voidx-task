import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

export interface Session {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export interface CreateContextOptions {
  session: Session | null;
}

export interface Context {
  prisma: PrismaClient;
  session: Session | null;
}

export async function createContext(
  opts: CreateContextOptions = { session: null },
): Promise<Context> {
  return {
    prisma,
    session: opts.session,
  };
}
