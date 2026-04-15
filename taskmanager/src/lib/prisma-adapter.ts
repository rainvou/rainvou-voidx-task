import type { Adapter, AdapterAccount, AdapterUser, AdapterSession } from "next-auth/adapters";
import type { PrismaClient } from "@/generated/prisma";

export function PrismaAdapter(prisma: PrismaClient): Adapter {
  return {
    async createUser(data) {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
        },
      });
      return user as AdapterUser;
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return user as AdapterUser;
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return user as AdapterUser;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
        include: { user: true },
      });
      if (!account?.user) return null;
      return account.user as AdapterUser;
    },

    async updateUser(data) {
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          image: data.image,
          emailVerified: data.emailVerified,
        },
      });
      return user as AdapterUser;
    },

    async deleteUser(userId) {
      await prisma.user.delete({ where: { id: userId } });
    },

    async linkAccount(data) {
      await prisma.account.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token ?? null,
          access_token: data.access_token ?? null,
          expires_at: data.expires_at ?? null,
          token_type: data.token_type ?? null,
          scope: data.scope ?? null,
          id_token: data.id_token ?? null,
          session_state: data.session_state as string | null,
        },
      });
      return data as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await prisma.account.delete({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
      });
    },

    async createSession(data) {
      const session = await prisma.session.create({
        data: {
          userId: data.userId,
          sessionToken: data.sessionToken,
          expires: data.expires,
        },
      });
      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      const result = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!result) return null;
      const { user, ...session } = result;
      return {
        session: session as AdapterSession,
        user: user as AdapterUser,
      };
    },

    async updateSession(data) {
      const session = await prisma.session.update({
        where: { sessionToken: data.sessionToken },
        data: {
          expires: data.expires,
          userId: data.userId,
        },
      });
      return session as AdapterSession;
    },

    async deleteSession(sessionToken) {
      await prisma.session.delete({ where: { sessionToken } });
    },

    async createVerificationToken(data) {
      const token = await prisma.verificationToken.create({
        data: {
          identifier: data.identifier,
          token: data.token,
          expires: data.expires,
        },
      });
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const verificationToken = await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
        return verificationToken;
      } catch {
        return null;
      }
    },
  };
}
