import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { permissionsFor } from "@/lib/auth/access";
import { PayrollWorkspace } from "@/components/hr/payroll-workspace";

export const metadata: Metadata = { title: "Oylik" };

export default async function PayrollPage() {
  const session = await auth();
  const canEdit = permissionsFor(session?.user.role).includes("payroll:update");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Oylik</h1>
        <p className="text-slate-400 text-sm mt-1">Davomat va ishbay ishlarga qarab avtomatik hisoblanadi</p>
      </div>
      <PayrollWorkspace canEdit={canEdit} />
    </div>
  );
}
