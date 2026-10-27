import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scheduleRemindersForOpportunity } from "@/lib/reminder-scheduler";

const STATUSES = ["PENDING", "APPLIED", "IGNORED", "MISSED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const opportunity = await prisma.opportunity.findFirst({ where: { id, userId: session.user.id } });

  if (!opportunity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.opportunity.update({
    where: { id },
    data: { status },
  });

  // Cancel reminders if applied or ignored
  if (status === "APPLIED" || status === "IGNORED") {
    await prisma.reminder.updateMany({
      where: { opportunityId: id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  }

  // Restoring an opportunity brings back its upcoming reminders.
  if (status === "PENDING" && opportunity.status !== "PENDING") {
    await scheduleRemindersForOpportunity(id, session.user.id);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const opportunity = await prisma.opportunity.findFirst({ where: { id, userId: session.user.id } });
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.opportunity.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
