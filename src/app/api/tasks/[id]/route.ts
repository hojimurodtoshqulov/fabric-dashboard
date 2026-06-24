import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db as prisma } from "@/lib/db";

const guard = async () => {
  try { await requireAuth(); return true; }
  catch { return false; }
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await guard()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: { task } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await guard()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, priority, title, description, dueDate, assignedToId } = body;

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (priority) update.priority = priority;
  if (title) update.title = title;
  if (description !== undefined) update.description = description;
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
  if (assignedToId !== undefined) update.assignedToId = assignedToId;
  if (status === "DONE") update.completedAt = new Date();

  const task = await prisma.task.update({
    where: { id },
    data: update,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, data: { task } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await guard()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
