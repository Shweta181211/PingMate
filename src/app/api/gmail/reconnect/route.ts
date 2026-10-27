import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Removes only the expired Google OAuth record. The user and their tracked
// opportunities stay intact; Google sign-in immediately creates fresh tokens.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.account.deleteMany({
    where: { userId: session.user.id, provider: "google" },
  });
  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: { gmailConnected: false, lastGmailSync: null },
    create: { userId: session.user.id, gmailConnected: false },
  });

  return NextResponse.json({ success: true });
}
