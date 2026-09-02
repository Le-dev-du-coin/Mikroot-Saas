"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings, Plus, Info, LogOut, Wifi } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const space = searchParams.get("space");
  const spaceSuffix = space ? `?space=${encodeURIComponent(space)}` : "";

  const menuItems = [
    { title: "Sessions de Routeurs", href: `/sessions${spaceSuffix}`, icon: Settings },
    { title: "Ajouter un Routeur", href: `/router/new${spaceSuffix}`, icon: Plus },
    { title: "À propos", href: `/about${spaceSuffix}`, icon: Info },
  ];

  return (
    <div className="flex w-64 flex-col border-r bg-card">
      <div className="border-b px-4">
        <Link href={`/sessions${spaceSuffix}`} className="flex h-14 items-center gap-2 font-black text-slate-900 dark:text-white">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <Wifi className="h-4 w-4" />
          </div>
          <span>{APP_NAME}</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors hover:bg-accent ${
              pathname === item.href.split("?")[0] ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
