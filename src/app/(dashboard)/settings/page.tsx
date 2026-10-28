import { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { UsersPanel } from "@/components/settings/users-panel";
import { OneCSyncPanel } from "@/components/settings/onec-sync-panel";
import { auth } from "@/lib/auth";
import { permissionsFor } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Sozlamalar" };

export default async function SettingsPage() {
  const session = await auth();
  const canManageUsers = permissionsFor(session?.user.role).includes("users:read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sozlamalar</h1>
        <p className="text-slate-400 text-sm mt-1">Tizim sozlamalari</p>
      </div>
      {canManageUsers && session && <UsersPanel currentUserId={session.user.id} />}
      <OneCSyncPanel />
      <SettingsPanel />
    </div>
  );
}
