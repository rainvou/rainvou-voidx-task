import { initTRPC } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const createTRPCContext = () => {
  return { prisma };
};

export type TRPCContext = ReturnType<typeof createTRPCContext>;

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
