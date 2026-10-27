import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { hasGmailScope } from "./gmail";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Accept the final Vercel/custom deployment host for OAuth callbacks.
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,

      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    // Auth.js only stores OAuth tokens when an account is first linked. Persist
    // the fresh tokens from every Google sign-in so Gmail access never goes
    // stale for returning users.
    async signIn({ account }) {
      if (account?.provider !== "google") return;
      await prisma.account.updateMany({
        where: { provider: "google", providerAccountId: account.providerAccountId },
        data: {
          access_token: account.access_token,
          expires_at: account.expires_at,
          id_token: account.id_token,
          scope: account.scope,
          token_type: account.token_type,
          ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
        },
      });

      // Record whether the Gmail checkbox was ticked on Google's consent screen.
      const stored = await prisma.account.findFirst({
        where: { provider: "google", providerAccountId: account.providerAccountId },
        select: { userId: true },
      });
      if (stored) {
        const gmailConnected = hasGmailScope(account.scope);
        await prisma.userSettings.upsert({
          where: { userId: stored.userId },
          update: { gmailConnected },
          create: { userId: stored.userId, gmailConnected },
        });
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    // Keep failures on an existing, polished route even if a development
    // server has stale route manifests after a restart.
    error: "/auth/signin",
  },
});
