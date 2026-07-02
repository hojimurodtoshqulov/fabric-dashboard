import { db } from "@/lib/db";
import { getCache, setCache, CACHE_KEYS } from "@/lib/cache";
import { PROVINCE_GROUPS } from "@/lib/provinces";
import dayjs from "dayjs";

export class AnalyticsService {
  async getSalesSummary(period: "daily" | "weekly" | "monthly" | "yearly"): Promise<Array<{ period: string; total: number; paid: number; count: number; overdue: number }>> {
    const cacheKey = CACHE_KEYS.analytics("sales", period);
    const cached = await getCache<Array<{ period: string; total: number; paid: number; count: number; overdue: number }>>(cacheKey);
    if (cached) return cached;

    const now = dayjs();
    let startDate: Date;
    let groupFormat: string;

    switch (period) {
      case "daily":
        startDate = now.subtract(30, "day").toDate();
        groupFormat = "YYYY-MM-DD";
        break;
      case "weekly":
        startDate = now.subtract(12, "week").toDate();
        groupFormat = "IYYY-IW";
        break;
      case "monthly":
        startDate = now.subtract(12, "month").toDate();
        groupFormat = "YYYY-MM";
        break;
      case "yearly":
        startDate = now.subtract(5, "year").toDate();
        groupFormat = "YYYY";
        break;
    }

    const invoices = await db.invoice.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
      select: {
        createdAt: true,
        total: true,
        paid: true,
        status: true,
      },
    });

    // Group by period
    const grouped = invoices.reduce(
      (acc, invoice) => {
        const key = dayjs(invoice.createdAt).format(groupFormat);
        if (!acc[key]) {
          acc[key] = { period: key, total: 0, paid: 0, count: 0, overdue: 0 };
        }
        acc[key].total += Number(invoice.total);
        acc[key].paid += Number(invoice.paid);
        acc[key].count += 1;
        if (invoice.status === "OVERDUE") acc[key].overdue += 1;
        return acc;
      },
      {} as Record<string, { period: string; total: number; paid: number; count: number; overdue: number }>
    );

    const result = Object.values(grouped).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    await setCache(cacheKey, result, 300);
    return result;
  }

  async getTopProducts(limit = 10) {
    const items = await db.invoiceItem.groupBy({
      by: ["productId", "name"],
      _sum: { total: true, quantity: true },
      _count: true,
      orderBy: { _sum: { total: "desc" } },
      take: limit,
      where: {
        invoice: { status: { not: "CANCELLED" } },
      },
    });

    return items.map((item) => ({
      productId: item.productId,
      name: item.name,
      totalRevenue: Number(item._sum.total || 0),
      totalQuantity: Number(item._sum.quantity || 0),
      orderCount: item._count,
    }));
  }

  async getClientStats() {
    const [statusGroups, recentActivity] = await Promise.all([
      db.client.groupBy({
        by: ["status"],
        _count: true,
      }),
      db.client.count({
        where: {
          lastActivity: { gte: dayjs().subtract(30, "day").toDate() },
        },
      }),
    ]);

    const stats = statusGroups.reduce(
      (acc, { status, _count }) => {
        acc[status] = _count;
        return acc;
      },
      {} as Record<string, number>
    );

    const total = Object.values(stats).reduce((s, n) => s + n, 0);
    const active = stats["ACTIVE"] || 0;
    const lost = stats["LOST"] || 0;

    return {
      total,
      byStatus: stats,
      activeCount: active,
      recentActivity,
      retentionRate: total > 0 ? Math.round((active / total) * 100) : 0,
      lostRate: total > 0 ? Math.round((lost / total) * 100) : 0,
    };
  }

  async getDebtStats() {
    const [pending, overdue, paid, partial] = await Promise.all([
      db.debt.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
      db.debt.aggregate({ where: { status: "OVERDUE" }, _sum: { amount: true }, _count: true }),
      db.debt.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
      db.debt.aggregate({ where: { status: "PARTIAL" }, _sum: { amount: true }, _count: true }),
    ]);

    const totalDebt =
      Number(pending._sum.amount || 0) +
      Number(overdue._sum.amount || 0) +
      Number(partial._sum.amount || 0);
    const totalRecovered = Number(paid._sum.amount || 0);

    return {
      totalDebt,
      totalRecovered,
      pending: { amount: Number(pending._sum.amount || 0), count: pending._count },
      overdue: { amount: Number(overdue._sum.amount || 0), count: overdue._count },
      paid: { amount: Number(paid._sum.amount || 0), count: paid._count },
      partial: { amount: Number(partial._sum.amount || 0), count: partial._count },
      recoveryRate:
        totalDebt + totalRecovered > 0
          ? Math.round((totalRecovered / (totalDebt + totalRecovered)) * 100)
          : 0,
    };
  }

  async getRegionPerformance() {
    const clients = await db.client.findMany({
      where: { region: { not: null } },
      select: {
        region: true,
        status: true,
        invoices: {
          select: { total: true, paid: true },
          where: { status: { not: "CANCELLED" } },
        },
      },
    });

    const regionMap = clients.reduce(
      (acc, client) => {
        const region = client.region!;
        if (!acc[region]) {
          acc[region] = { region, clients: 0, revenue: 0, active: 0 };
        }
        acc[region].clients += 1;
        if (client.status === "ACTIVE") acc[region].active += 1;
        acc[region].revenue += client.invoices.reduce(
          (s, inv) => s + Number(inv.total),
          0
        );
        return acc;
      },
      {} as Record<string, { region: string; clients: number; revenue: number; active: number }>
    );

    return Object.values(regionMap).sort((a, b) => b.revenue - a.revenue);
  }

  async getManagerPerformance() {
    const managers = await db.user.findMany({
      where: { role: { name: { in: ["MANAGER", "WORKER"] } }, isActive: true },
      select: {
        id: true,
        name: true,
        assignedClients: {
          select: {
            status: true,
            invoices: {
              select: { total: true, paid: true },
              where: { status: "PAID" },
            },
          },
        },
      },
    });

    return managers.map((mgr) => {
      const revenue = mgr.assignedClients
        .flatMap((c) => c.invoices)
        .reduce((s, inv) => s + Number(inv.paid), 0);
      const activeClients = mgr.assignedClients.filter(
        (c) => c.status === "ACTIVE"
      ).length;

      return {
        id: mgr.id,
        name: mgr.name,
        totalClients: mgr.assignedClients.length,
        activeClients,
        revenue,
      };
    });
  }

  async getProvinceStats() {
    type RawRow = {
      province: string;
      client_count: bigint;
      total_revenue: unknown;
      total_paid: unknown;
      overdue_debts: bigint;
      overdue_amount: unknown;
    };

    const rows = await db.$queryRaw<RawRow[]>`
      SELECT
        c.province,
        COUNT(DISTINCT c.id)::bigint AS client_count,
        COALESCE(SUM(CASE WHEN i.status != 'CANCELLED' THEN i.total ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN i.status != 'CANCELLED' THEN i.paid  ELSE 0 END), 0) AS total_paid,
        COUNT(DISTINCT CASE WHEN d.status = 'OVERDUE' THEN d.id END)::bigint AS overdue_debts,
        COALESCE(SUM(CASE WHEN d.status = 'OVERDUE' THEN d.amount - d."paidAmount" ELSE 0 END), 0) AS overdue_amount
      FROM clients c
      LEFT JOIN invoices i ON i."clientId" = c.id
      LEFT JOIN debts d ON d."clientId" = c.id
      WHERE c.province IS NOT NULL
      GROUP BY c.province
      ORDER BY total_revenue DESC
    `;

    return rows.map((r) => ({
      province: r.province,
      label: PROVINCE_GROUPS.find((p) => p.key === r.province)?.label ?? r.province,
      clientCount: Number(r.client_count),
      totalRevenue: Number(r.total_revenue),
      totalPaid: Number(r.total_paid),
      overdueDebts: Number(r.overdue_debts),
      overdueAmount: Number(r.overdue_amount),
    }));
  }

  async getLeadSourcePerformance() {
    const sources = await db.leadSource.findMany({
      include: {
        clients: {
          select: {
            status: true,
            invoices: {
              select: { total: true },
              where: { status: "PAID" },
            },
          },
        },
      },
    });

    return sources.map((source) => {
      const revenue = source.clients
        .flatMap((c) => c.invoices)
        .reduce((s, inv) => s + Number(inv.total), 0);
      const converted = source.clients.filter(
        (c) => c.status === "ACTIVE"
      ).length;

      return {
        id: source.id,
        name: source.name,
        totalLeads: source.clients.length,
        converted,
        revenue,
        conversionRate:
          source.clients.length > 0
            ? Math.round((converted / source.clients.length) * 100)
            : 0,
      };
    });
  }

  async getDashboardOverview() {
    const [clientStats, debtStats, todaySales, monthlySales, taskStats] =
      await Promise.all([
        this.getClientStats(),
        this.getDebtStats(),
        db.invoice.aggregate({
          where: {
            createdAt: { gte: dayjs().startOf("day").toDate() },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true, paid: true },
          _count: true,
        }),
        db.invoice.aggregate({
          where: {
            createdAt: { gte: dayjs().startOf("month").toDate() },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true, paid: true },
          _count: true,
        }),
        db.task.groupBy({
          by: ["status"],
          _count: true,
        }),
      ]);

    return {
      clients: clientStats,
      debts: debtStats,
      today: {
        sales: Number(todaySales._sum.total || 0),
        paid: Number(todaySales._sum.paid || 0),
        invoices: todaySales._count,
      },
      monthly: {
        sales: Number(monthlySales._sum.total || 0),
        paid: Number(monthlySales._sum.paid || 0),
        invoices: monthlySales._count,
      },
      tasks: taskStats.reduce((acc, { status, _count }) => {
        acc[status] = _count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const analyticsService = new AnalyticsService();
