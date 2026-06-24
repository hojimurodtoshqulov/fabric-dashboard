import axios from "axios";
import { config } from "@/config";

interface GoIPCallParams {
  phone: string;
  audioUrl: string;
  trunk?: string;
}

interface GoIPCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

export class GoIPClient {
  private baseUrl: string;
  private auth: { username: string; password: string };

  constructor() {
    this.baseUrl = `http://${config.goip.host}:${config.goip.port}`;
    this.auth = {
      username: config.goip.username,
      password: config.goip.password,
    };
  }

  async initiateCall(params: GoIPCallParams): Promise<GoIPCallResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/default/en_US/make_call.html`, {
        auth: this.auth,
        params: {
          line: params.trunk || config.goip.trunk,
          phonenumber: this.formatPhone(params.phone),
          sip_uri: params.audioUrl,
        },
        timeout: 10000,
      });

      const success = response.data?.includes("OK") ||
        response.status === 200;

      return {
        success,
        callId: response.data?.match(/callid=([^\s&]+)/)?.[1],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "GoIP call failed",
      };
    }
  }

  async getCallStatus(callId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/default/en_US/call_status.html`, {
        auth: this.auth,
        params: { callid: callId },
        timeout: 5000,
      });
      return response.data || "UNKNOWN";
    } catch {
      return "UNKNOWN";
    }
  }

  async hangupCall(callId: string): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/default/en_US/hangup_call.html`, {
        auth: this.auth,
        params: { callid: callId },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("998")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+998${cleaned.slice(1)}`;
    return `+998${cleaned}`;
  }
}

export const goipClient = new GoIPClient();
