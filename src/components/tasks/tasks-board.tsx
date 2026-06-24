"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare, Clock, AlertCircle, User } from "lucide-react";
import { useState } from "react";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW:      { label: "Past",      className: "border-slate-700 text-slate-400" },
  MEDIUM:   { label: "O'rta",     className: "border-blue-800 text-blue-400" },
  HIGH:     { label: "Yuqori",    className: "border-orange-800 text-orange-400" },
  URGENT:   { label: "Shoshilinch", className: "border-red-800 text-red-400" },
};

const STATUS_COLUMNS = [
  { key: "TODO",        label: "Bajarilishi kerak", icon: Clock,        color: "text-slate-400", border: "border-slate-700" },
  { key: "IN_PROGRESS", label: "Jarayonda",         icon: AlertCircle,  color: "text-blue-400",  border: "border-blue-800" },
  { key: "REVIEW",      label: "Ko'rib chiqilmoqda",icon: User,         color: "text-yellow-400",border: "border-yellow-800" },
  { key: "DONE",        label: "Bajarildi",         icon: CheckSquare,  color: "text-green-400", border: "border-green-800" },
];

interface Task {
  id: string; title: string; priority: string; status: string;
  dueDate: string | null;
  assignedTo: { name: string } | null;
  createdAt: string;
}

export function TasksBoard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?limit=100");
      const json = await res.json();
      return json.data as { tasks: Task[]; total: number };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasksByStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = data?.tasks?.filter(t => t.status === col.key) ?? [];
    return acc;
  }, {} as Record<string, Task[]>);

  const totalTasks = data?.total ?? 0;
  const doneTasks = tasksByStatus["DONE"]?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {STATUS_COLUMNS.map(col => (
          <div key={col.key} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <col.icon className={`h-5 w-5 mx-auto mb-1 ${col.color}`} />
            <p className="text-white text-xl font-bold">{tasksByStatus[col.key]?.length ?? 0}</p>
            <p className="text-slate-500 text-xs">{col.label}</p>
          </div>
        ))}
      </div>

      {totalTasks > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Umumiy progress</span>
            <span className="text-white text-sm font-medium">{doneTasks}/{totalTasks}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${totalTasks ? (doneTasks / totalTasks) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(col => (
          <div key={col.key} className="space-y-2">
            <div className={`flex items-center gap-2 pb-2 border-b ${col.border}`}>
              <col.icon className={`h-3.5 w-3.5 ${col.color}`} />
              <span className={`text-xs font-medium ${col.color}`}>{col.label}</span>
              <span className="ml-auto text-slate-600 text-xs">{tasksByStatus[col.key]?.length ?? 0}</span>
            </div>
            {isLoading ? (
              <div className="h-20 bg-slate-800 rounded-lg animate-pulse" />
            ) : tasksByStatus[col.key]?.length === 0 ? (
              <div className="h-16 flex items-center justify-center border border-dashed border-slate-800 rounded-lg">
                <p className="text-slate-700 text-xs">Bo'sh</p>
              </div>
            ) : (
              tasksByStatus[col.key].map(task => (
                <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors">
                  <p className="text-white text-xs font-medium leading-snug mb-2">{task.title}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] ${PRIORITY_CONFIG[task.priority]?.className}`}>
                      {PRIORITY_CONFIG[task.priority]?.label}
                    </Badge>
                    {task.assignedTo && (
                      <span className="text-slate-500 text-[10px]">{task.assignedTo.name.split(" ")[0]}</span>
                    )}
                  </div>
                  {task.dueDate && (
                    <p className="text-slate-600 text-[10px] mt-1.5">
                      {new Date(task.dueDate).toLocaleDateString("uz-UZ")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
