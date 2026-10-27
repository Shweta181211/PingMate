// Kept as a compatibility entry point. Authentication configuration lives in
// lib/auth.ts so every route uses one Prisma-backed NextAuth instance.
export { handlers, signIn, signOut, auth } from "@/lib/auth";
