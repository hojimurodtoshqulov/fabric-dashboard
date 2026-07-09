import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("calls:create");
    const { id: callId } = await params;
    const { responseKey, responseLabel } = await req.json() as { responseKey: string; responseLabel: string };

    if (!responseKey || !responseLabel) {
      return handleApiError(Object.assign(new Error("responseKey and responseLabel required"), { code: "VALIDATION_ERROR" }));
    }

    const call = await db.call.findUnique({ where: { id: callId }, select: { clientId: true } });
    if (!call) return handleApiError(Object.assign(new Error("Call not found"), { code: "NOT_FOUND" }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (db as any).callResponse.create({
      data: { callId, clientId: call.clientId, responseKey, responseLabel },
    });
    return apiSuccess({ response });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("calls:read");
    const { id: callId } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responses = await (db as any).callResponse.findMany({
      where: { callId },
      orderBy: { createdAt: "asc" },
    });
    return apiSuccess({ responses });
  } catch (e) {
    return handleApiError(e);
  }
}
