import { Metadata } from "next";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Vazifalar" };

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vazifalar</h1>
          <p className="text-slate-400 text-sm mt-1">Jamoaviy vazifalarni boshqarish</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500">
          <Plus className="mr-2 h-4 w-4" /> Yangi vazifa
        </Button>
      </div>
      <TasksBoard />
    </div>
  );
}
