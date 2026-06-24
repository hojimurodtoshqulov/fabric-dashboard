"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Building2, Bot, MessageSquare, Phone, Shield } from "lucide-react";

interface Setting { key: string; value: string }

const SECTIONS = [
  {
    id: "company", label: "Kompaniya ma'lumotlari", icon: Building2,
    keys: ["company_name", "company_phone", "company_email", "company_address"],
    labels: { company_name: "Kompaniya nomi", company_phone: "Telefon", company_email: "Email", company_address: "Manzil" },
  },
  {
    id: "telegram", label: "Telegram Bot", icon: MessageSquare,
    keys: ["telegram_bot_token", "telegram_bot_username"],
    labels: { telegram_bot_token: "Bot Token", telegram_bot_username: "Bot Username" },
    secret: ["telegram_bot_token"],
  },
  {
    id: "goip", label: "GoIP Gateway", icon: Phone,
    keys: ["goip_host", "goip_port", "goip_username", "goip_password"],
    labels: { goip_host: "GoIP Host", goip_port: "Port", goip_username: "Username", goip_password: "Parol" },
    secret: ["goip_password"],
  },
  {
    id: "ai", label: "AI Sozlamalari", icon: Bot,
    keys: ["openai_api_key", "openai_model", "google_tts_key"],
    labels: { openai_api_key: "OpenAI API Key", openai_model: "OpenAI Model", google_tts_key: "Google TTS Key" },
    secret: ["openai_api_key", "google_tts_key"],
  },
];

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("company");
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return (json.data?.settings ?? []) as Setting[];
    },
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: Setting) => { map[s.key] = String(s.value); });
      setLocalValues(map);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: Object.entries(updates).map(([key, value]) => ({ key, value })) }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const currentSection = SECTIONS.find(s => s.id === activeSection)!;

  const getValue = (key: string) => localValues[key] ?? settings?.find(s => s.key === key)?.value ?? "";

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <nav className="space-y-1">
          {SECTIONS.map(sec => (
            <button key={sec.id} onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeSection === sec.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}>
              <sec.icon className="h-4 w-4" />
              {sec.label}
            </button>
          ))}
          <button onClick={() => setActiveSection("security")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeSection === "security"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}>
            <Shield className="h-4 w-4" /> Xavfsizlik
          </button>
        </nav>
      </div>

      <div className="flex-1">
        {activeSection === "security" ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-6 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" /> Parolni o'zgartirish
            </h3>
            <div className="space-y-4 max-w-md">
              {[["Joriy parol", "current_password"], ["Yangi parol", "new_password"], ["Yangi parolni tasdiqlash", "confirm_password"]].map(([label, id]) => (
                <div key={id}>
                  <Label className="text-slate-400 text-sm">{label}</Label>
                  <Input type="password" className="mt-1.5 bg-slate-800 border-slate-700 text-white" />
                </div>
              ))}
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
                <Save className="h-4 w-4 mr-2" /> Parolni o'zgartirish
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-6 flex items-center gap-2">
              <currentSection.icon className="h-4 w-4 text-indigo-400" /> {currentSection.label}
            </h3>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4 max-w-lg">
                {currentSection.keys.map(key => (
                  <div key={key}>
                    <Label className="text-slate-400 text-sm">{(currentSection.labels as unknown as Record<string, string>)[key]}</Label>
                    <Input
                      type={currentSection.secret?.includes(key) ? "password" : "text"}
                      value={getValue(key)}
                      onChange={(e) => setLocalValues(prev => ({ ...prev, [key]: e.target.value }))}
                      className="mt-1.5 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                      placeholder={`${(currentSection.labels as unknown as Record<string, string>)[key]} kiriting...`}
                    />
                  </div>
                ))}
                <Button
                  onClick={() => saveMutation.mutate(localValues)}
                  disabled={saveMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
                  <Save className="h-4 w-4 mr-2" />
                  {saved ? "Saqlandi!" : saveMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
