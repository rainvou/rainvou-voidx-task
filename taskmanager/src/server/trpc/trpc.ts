/**
 * Shared tRPC infrastructure.
 *
 * This file is intentionally small – it only exports the primitives that
 * other routers (`comment.ts`, etc.) import.  The actual root router
 * composition lives in `router.ts`.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

export interface Session {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface Context {
  prisma: PrismaClient;
  session: Session | null;
}

/* ------------------------------------------------------------------ */
/*  tRPC init                                                          */
/* ------------------------------------------------------------------ */

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure – ensures the caller has a valid session.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session as Session,
    },
  });
});
