import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: any = { userId: session.user.id };

  if (category && category !== "ALL") where.category = category;
  if (status && status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ];
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    include: {
      email: {
        select: { sender: true, senderEmail: true },
      },
      reminders: {
        select: { id: true, scheduledAt: true, status: true, type: true },
      },
    },
  });

  return NextResponse.json(opportunities);
}
