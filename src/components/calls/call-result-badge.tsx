import { Badge } from "@/components/ui/badge";
import { CALL_RESULT_LABELS } from "@/constants";

const COLORS: Record<string, string> = {
  PAYMENT_CONFIRMED:  "bg-emerald-500/20 text-emerald-300",
  PROMISE_TO_PAY:     "bg-teal-500/20 text-teal-300",
  INTERESTED:         "bg-blue-500/20 text-blue-300",
  CALLBACK_REQUESTED: "bg-yellow-500/20 text-yellow-300",
  NOT_INTERESTED:     "bg-red-500/20 text-red-300",
  NO_ANSWER:          "bg-slate-600/40 text-slate-400",
  BUSY:               "bg-orange-500/20 text-orange-300",
  ANSWERED:           "bg-indigo-500/20 text-indigo-300",
};

export function CallResultBadge({ result }: { result?: string | null }) {
  if (!result) return null;
  return (
    <Badge className={`border-0 text-xs ${COLORS[result] ?? "bg-slate-700 text-slate-300"}`}>
      {CALL_RESULT_LABELS[result] ?? result}
    </Badge>
  );
}
