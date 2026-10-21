import { Metadata } from "next";
import { CalendarCheck, Users, Table2, Hammer } from "lucide-react";
import { auth } from "@/lib/auth";
import { permissionsFor } from "@/lib/auth/access";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceDay } from "@/components/hr/attendance-day";
import { EmployeesTab } from "@/components/hr/employees-tab";
import { TimesheetTab } from "@/components/hr/timesheet-tab";
import { PieceworkTab } from "@/components/hr/piecework-tab";

export const metadata: Metadata = { title: "Xodimlar" };

const tabCls = "data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 gap-2";

export default async function HrPage() {
  const session = await auth();
  const perms = permissionsFor(session?.user.role);
  const canMark = perms.includes("attendance:update");
  const canEditEmployees = perms.includes("employees:update");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Xodimlar</h1>
        <p className="text-slate-400 text-sm mt-1">Davomat, tabel va ishbay ishlar</p>
      </div>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="attendance" className={tabCls}><CalendarCheck className="w-3.5 h-3.5" /> Davomat</TabsTrigger>
          <TabsTrigger value="employees" className={tabCls}><Users className="w-3.5 h-3.5" /> Xodimlar</TabsTrigger>
          <TabsTrigger value="timesheet" className={tabCls}><Table2 className="w-3.5 h-3.5" /> Tabel</TabsTrigger>
          <TabsTrigger value="piecework" className={tabCls}><Hammer className="w-3.5 h-3.5" /> Ishbay</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="mt-0"><AttendanceDay canEdit={canMark} /></TabsContent>
        <TabsContent value="employees" className="mt-0"><EmployeesTab canEdit={canEditEmployees} /></TabsContent>
        <TabsContent value="timesheet" className="mt-0"><TimesheetTab /></TabsContent>
        <TabsContent value="piecework" className="mt-0"><PieceworkTab canEdit={canMark} /></TabsContent>
      </Tabs>
    </div>
  );
}
