"use client";

import { signOut } from "next-auth/react";
import type { SessionUser } from "@/types";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: "Direktor",
  MANAGER: "Menejer",
  WORKER: "Xodim",
};

interface HeaderProps {
  user: SessionUser;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">Xush kelibsiz,</span>
        <span className="text-white font-medium text-sm">{user.name}</span>
        <Badge variant="outline" className="text-indigo-400 border-indigo-800 text-xs">
          {ROLE_LABELS[user.role] || user.role}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white relative"
          asChild
        >
          <a href="/notifications">
            <Bell className="h-4 w-4" />
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                <AvatarFallback className="bg-indigo-700 text-white text-sm">
                  {user.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 bg-slate-800 border-slate-700"
            align="end"
          >
            <DropdownMenuLabel className="text-slate-200">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-slate-400 font-normal">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem className="text-slate-300 hover:text-white cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              className="text-red-400 hover:text-red-300 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
