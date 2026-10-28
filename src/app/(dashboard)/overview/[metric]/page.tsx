import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MetricDetailView } from "@/components/analytics/metric-detail";
import { METRICS, isMetric } from "@/lib/analytics/metrics";

export async function generateMetadata({ params }: { params: Promise<{ metric: string }> }): Promise<Metadata> {
  const { metric } = await params;
  return { title: isMetric(metric) ? METRICS[metric].title : "Bosh sahifa" };
}

export default async function MetricPage({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  if (!isMetric(metric)) notFound();
  return <MetricDetailView metric={metric} />;
}
