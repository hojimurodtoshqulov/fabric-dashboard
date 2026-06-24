import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { clientService } from "@/services/crm/client.service";
import { db } from "@/lib/db";
import { ClientDetailView } from "@/components/crm/client-detail-view";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const client = await clientService.getById(id);
  return { title: client ? `${client.name} — CRM` : "Mijoz topilmadi" };
}

export default async function ClientDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const client = await clientService.getById(id);
  if (!client) notFound();

  const [invoices, calls, tasks, debts] = await Promise.all([
    db.invoice.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, number: true, status: true,
        total: true, paid: true, dueDate: true, createdAt: true,
      },
    }),
    db.call.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, status: true, purpose: true,
        duration: true, createdAt: true,
      },
    }),
    db.task.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, title: true, status: true,
        priority: true, dueDate: true,
        assignedTo: { select: { name: true } },
      },
    }),
    db.debt.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, status: true,
        amount: true, paidAmount: true, dueDate: true,
      },
    }),
  ]);

  return (
    <ClientDetailView
      client={JSON.parse(JSON.stringify(client))}
      invoices={JSON.parse(JSON.stringify(invoices))}
      calls={JSON.parse(JSON.stringify(calls))}
      tasks={JSON.parse(JSON.stringify(tasks))}
      debts={JSON.parse(JSON.stringify(debts))}
    />
  );
}
