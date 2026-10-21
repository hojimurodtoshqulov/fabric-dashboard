import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { permissionsFor } from "@/lib/auth/access";
import { ExpensesWorkspace } from "@/components/finance/expenses-workspace";

export const metadata: Metadata = { title: "Xarajatlar" };

export default async function ExpensesPage() {
  const session = await auth();
  const canEdit = permissionsFor(session?.user.role).includes("expenses:update");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Xarajatlar</h1>
        <p className="text-slate-400 text-sm mt-1">Kommunal, ijara, transport, ta&apos;mirlash va boshqa oylik xarajatlar</p>
      </div>
      <ExpensesWorkspace canEdit={canEdit} />
    </div>
  );
}
