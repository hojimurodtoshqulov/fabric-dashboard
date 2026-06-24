import OpenAI from "openai";
import { config } from "@/config";

export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export async function generateCallScript(context: {
  clientName: string;
  purpose: string;
  debtAmount?: number;
  dueDate?: string;
  productName?: string;
  lastInteraction?: string;
}): Promise<string> {
  const { clientName, purpose, debtAmount, dueDate, productName, lastInteraction } = context;

  const systemPrompt = `Siz tibbiy paxta va bint fabrikasi nomidan qo'ng'iroq qilayotgan professional savdo mutaxassisi siz.
Uzbek tilida muloqot qiling. Samimiy, lekin professional bo'ling.
Mijozni hurmat qiling va tushunish bilan yondashing.
Javob faqat nutq matni bo'lsin - qo'shimcha izohlar yo'q.`;

  let userPrompt = "";

  if (purpose === "DEBT_REMINDER") {
    userPrompt = `${clientName} ismli mijozga qo'ng'iroq skriptini yozing.
Qarz miqdori: ${debtAmount?.toLocaleString()} so'm
To'lov muddati: ${dueDate}
Maqsad: Qarzni eslatish va to'lov muddadini belgilash.
Skript 30-45 soniyalik bo'lsin. Boshlang'ich salom, qarz eslatmasi va to'lov imkoniyatlari haqida so'rang.`;
  } else if (purpose === "REACTIVATION") {
    userPrompt = `${clientName} ismli sobiq mijozga qayta jalb qilish uchun qo'ng'iroq skriptini yozing.
So'nggi muloqot: ${lastInteraction}
Maqsad: Mijozni qaytarish, yangi mahsulotlar haqida ma'lumot berish.
Skript 30-40 soniyalik bo'lsin.`;
  } else if (purpose === "OFFER") {
    userPrompt = `${clientName} ismli mijozga yangi taklif qo'ng'iroq skriptini yozing.
Mahsulot: ${productName}
Maqsad: Yangi mahsulot yoki chegirma haqida ma'lumot berish.
Skript 25-35 soniyalik bo'lsin.`;
  } else {
    userPrompt = `${clientName} ismli mijozga kuzatuv qo'ng'iroq skriptini yozing.
Maqsad: Mijoz holini so'rash va xizmat sifatini tekshirish.
Skript 20-30 soniyalik bo'lsin.`;
  }

  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function analyzeComment(text: string): Promise<{
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  intent: string;
  suggestedReply: string;
}> {
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: "system",
        content: `Siz ijtimoiy media kommentariyalarini tahlil qiluvchi AI siz.
JSON formatida javob bering: { "sentiment": "POSITIVE|NEUTRAL|NEGATIVE", "intent": "string", "suggestedReply": "string" }
Uzbek tilida javob yozing.`,
      },
      { role: "user", content: `Kommentariyani tahlil qiling: "${text}"` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 200,
  });

  try {
    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch {
    return { sentiment: "NEUTRAL", intent: "unknown", suggestedReply: "" };
  }
}

export async function detectProductDemand(comments: string[]): Promise<{
  topProducts: string[];
  commonRequests: string[];
  insights: string;
}> {
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: "system",
        content: `Siz marketing analitiki siz. Kommentariyalardan mahsulot talabini aniqlang.
JSON formatida javob bering: { "topProducts": ["string"], "commonRequests": ["string"], "insights": "string" }`,
      },
      {
        role: "user",
        content: `Quyidagi kommentariyalarni tahlil qiling:\n${comments.join("\n")}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 400,
  });

  try {
    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch {
    return { topProducts: [], commonRequests: [], insights: "" };
  }
}
