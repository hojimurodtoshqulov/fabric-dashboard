import { db } from "@/lib/db";
import type { DtmfConfig } from "@/types";

// Prisma client not regenerated yet (Windows DLL lock) — use $queryRaw for new tables

type VoiceTemplateRow = {
  id: string;
  name: string;
  type: string;
  title: string;
  description: string | null;
  audioFileUrl: string | null;
  isActive: boolean;
  dtmfConfig: DtmfConfig | null;
  sendSmsAfterCall: boolean;
  smsText: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type VoiceTemplateWithCount = VoiceTemplateRow & { _count: { calls: number } };
type VoiceTemplateWithCallCount = VoiceTemplateRow & { callCount: bigint };

function newId() {
  return `vt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateTemplateInput {
  name: string;
  type: string;
  title: string;
  description?: string;
  audioFileUrl?: string;
  dtmfConfig?: DtmfConfig | null;
  isActive?: boolean;
  sendSmsAfterCall?: boolean;
  smsText?: string | null;
}

export const voiceTemplateService = {
  async list(): Promise<VoiceTemplateWithCount[]> {
    const rows = await db.$queryRaw<VoiceTemplateWithCallCount[]>`
      SELECT vt.*,
             (SELECT COUNT(*) FROM calls c WHERE c."voiceTemplateId" = vt.id)::bigint AS "callCount"
      FROM voice_templates vt
      ORDER BY vt."createdAt" DESC
    `;
    return rows.map(({ callCount, ...r }) => ({ ...r, _count: { calls: Number(callCount) } }));
  },

  async getById(id: string): Promise<VoiceTemplateWithCount | null> {
    const rows = await db.$queryRaw<VoiceTemplateWithCallCount[]>`
      SELECT vt.*,
             (SELECT COUNT(*) FROM calls c WHERE c."voiceTemplateId" = vt.id)::bigint AS "callCount"
      FROM voice_templates vt
      WHERE vt.id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    const { callCount, ...r } = rows[0];
    return { ...r, _count: { calls: Number(callCount) } };
  },

  async getByType(type: string): Promise<VoiceTemplateRow | null> {
    const rows = await db.$queryRaw<VoiceTemplateRow[]>`
      SELECT * FROM voice_templates
      WHERE type = ${type} AND "isActive" = true
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async create(input: CreateTemplateInput): Promise<VoiceTemplateWithCount> {
    const id = newId();
    const ts = new Date();
    const dtmf = input.dtmfConfig ? JSON.stringify(input.dtmfConfig) : null;
    const isActive = input.isActive ?? true;
    const sendSms = input.sendSmsAfterCall ?? false;
    const smsText = input.smsText ?? null;
    await db.$executeRaw`
      INSERT INTO voice_templates (id, name, type, title, description, "audioFileUrl", "isActive", "dtmfConfig", "sendSmsAfterCall", "smsText", "createdAt", "updatedAt")
      VALUES (${id}, ${input.name}, ${input.type}::"VoiceTemplateType", ${input.title},
              ${input.description ?? null}, ${input.audioFileUrl ?? null},
              ${isActive}, ${dtmf}::jsonb, ${sendSms}, ${smsText}, ${ts}, ${ts})
    `;
    return (await this.getById(id))!;
  },

  async update(id: string, input: Partial<CreateTemplateInput>): Promise<VoiceTemplateWithCount> {
    const ts = new Date();
    if (input.name !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET name = ${input.name}, "updatedAt" = ${ts} WHERE id = ${id}`;
    if (input.type !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET type = ${input.type}::"VoiceTemplateType", "updatedAt" = ${ts} WHERE id = ${id}`;
    if (input.title !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET title = ${input.title}, "updatedAt" = ${ts} WHERE id = ${id}`;
    if (input.description !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET description = ${input.description ?? null}, "updatedAt" = ${ts} WHERE id = ${id}`;
    if (input.audioFileUrl !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET "audioFileUrl" = ${input.audioFileUrl ?? null}, "updatedAt" = ${ts} WHERE id = ${id}`;
    if (input.isActive !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET "isActive" = ${input.isActive}, "updatedAt" = ${ts} WHERE id = ${id}`;
    if (input.dtmfConfig !== undefined) {
      const dtmf = input.dtmfConfig ? JSON.stringify(input.dtmfConfig) : null;
      await db.$executeRaw`UPDATE voice_templates SET "dtmfConfig" = ${dtmf}::jsonb, "updatedAt" = ${ts} WHERE id = ${id}`;
    }
    if (input.sendSmsAfterCall !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET "sendSmsAfterCall" = ${input.sendSmsAfterCall}, "updatedAt" = ${ts} WHERE id = ${id}`;
    if (input.smsText !== undefined)
      await db.$executeRaw`UPDATE voice_templates SET "smsText" = ${input.smsText ?? null}, "updatedAt" = ${ts} WHERE id = ${id}`;
    return (await this.getById(id))!;
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    await db.$executeRaw`UPDATE voice_templates SET "isActive" = ${isActive}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
  },

  async delete(id: string): Promise<void> {
    await db.$executeRaw`DELETE FROM voice_templates WHERE id = ${id}`;
  },

  async setAudioUrl(id: string, audioFileUrl: string): Promise<VoiceTemplateWithCount> {
    await db.$executeRaw`UPDATE voice_templates SET "audioFileUrl" = ${audioFileUrl}, "updatedAt" = ${new Date()} WHERE id = ${id}`;
    return (await this.getById(id))!;
  },
};
