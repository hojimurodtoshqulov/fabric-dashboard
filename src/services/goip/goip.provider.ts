import { config } from "@/config";

export interface MakeCallParams {
  phone: string;
  audioUrl: string;
  line?: string;
}

export interface CallStatusResult {
  status: "RINGING" | "CONNECTED" | "COMPLETED" | "FAILED" | "BUSY" | "NO_ANSWER" | "HANGUP";
  duration?: number;
  dtmf?: string;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("998")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 12) return `+998${digits.slice(1)}`;
  if (digits.length === 9) return `+998${digits}`;
  return `+${digits}`;
}

function buildUrl(path: string, params: Record<string, string>): string {
  const base = `http://${config.goip.host}:${config.goip.port}${path}`;
  const qs = new URLSearchParams(params).toString();
  return `${base}?${qs}`;
}

async function goipFetch(url: string): Promise<string> {
  const creds = Buffer.from(`${config.goip.username}:${config.goip.password}`).toString("base64");
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${creds}` },
    signal: AbortSignal.timeout(10_000),
  });
  return res.text();
}

export async function makeCall(params: MakeCallParams): Promise<{ success: boolean; callId?: string; error?: string }> {
  try {
    const phone = formatPhone(params.phone);
    const url = buildUrl("/make_call.html", {
      line: params.line ?? config.goip.trunk,
      phonenumber: phone,
      sip_uri: params.audioUrl,
    });
    const text = await goipFetch(url);
    const match = text.match(/call_id[=:](\S+)/i) ?? text.match(/id[=:](\w+)/i);
    if (text.toLowerCase().includes("ok") || text.toLowerCase().includes("success") || match) {
      return { success: true, callId: match?.[1] ?? `goip-${Date.now()}` };
    }
    return { success: false, error: text.slice(0, 200) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getCallStatus(goipCallId: string): Promise<CallStatusResult> {
  try {
    const url = buildUrl("/call_status.html", { call_id: goipCallId });
    const text = await goipFetch(url);
    const upper = text.toUpperCase();
    let status: CallStatusResult["status"] = "RINGING";
    if (upper.includes("COMPLETED") || upper.includes("HANGUP")) status = "COMPLETED";
    else if (upper.includes("FAILED") || upper.includes("ERROR")) status = "FAILED";
    else if (upper.includes("BUSY")) status = "BUSY";
    else if (upper.includes("NO_ANSWER") || upper.includes("NOANSWER")) status = "NO_ANSWER";
    else if (upper.includes("CONNECTED") || upper.includes("ANSWER")) status = "CONNECTED";

    const durMatch = text.match(/duration[=:](\d+)/i);
    const dtmfMatch = text.match(/dtmf[=:](\d)/i);
    return {
      status,
      duration: durMatch ? parseInt(durMatch[1]) : undefined,
      dtmf: dtmfMatch?.[1],
    };
  } catch {
    return { status: "FAILED" };
  }
}

export async function hangup(goipCallId: string): Promise<boolean> {
  try {
    const url = buildUrl("/hangup.html", { call_id: goipCallId });
    const text = await goipFetch(url);
    return text.toLowerCase().includes("ok");
  } catch {
    return false;
  }
}

export async function getDTMF(goipCallId: string): Promise<string | null> {
  try {
    const url = buildUrl("/get_dtmf.html", { call_id: goipCallId });
    const text = await goipFetch(url);
    const match = text.match(/dtmf[=:](\d)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
