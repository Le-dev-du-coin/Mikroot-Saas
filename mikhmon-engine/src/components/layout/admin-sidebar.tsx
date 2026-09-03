"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings, Plus, Info, LogOut, Wifi, Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/constants";

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const space = searchParams.get("space");
  const spaceSuffix = space ? `?space=${encodeURIComponent(space)}` : "";

  const menuItems = [
    { title: "Sessions de Routeurs", href: `/sessions${spaceSuffix}`, icon: Settings },
    { title: "Ajouter un Routeur", href: `/router/new${spaceSuffix}`, icon: Plus },
    { title: "À propos", href: `/about${spaceSuffix}`, icon: Info },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  const navLinks = (
    <nav className="flex-1 p-3 space-y-1">
      {menuItems.map((item) => {
        const isActive = pathname === item.href.split("?")[0];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all min-h-[44px] ${
              isActive
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="h-10 w-10 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>

          <Link href={`/sessions${spaceSuffix}`} className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Wifi className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">{APP_NAME}</span>
          </Link>
        </div>

        {space && (
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold border border-blue-200/60 dark:border-blue-900/60 truncate max-w-[150px]">
            {space}
          </span>
        )}

        {/* Mobile Sheet Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card">
            <SheetHeader className="h-14 border-b px-4 flex justify-center">
              <SheetTitle className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-left">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Wifi className="h-4 w-4" />
                </div>
                <span>{APP_NAME}</span>
              </SheetTitle>
            </SheetHeader>

            {navLinks}

            <div className="border-t p-3">
              <Button
                variant="ghost"
                className="w-full justify-start text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer min-h-[44px]"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0">
        <div className="border-b px-4">
          <Link href={`/sessions${spaceSuffix}`} className="flex h-14 items-center gap-2 font-black text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Wifi className="h-4 w-4" />
            </div>
            <span>{APP_NAME}</span>
          </Link>
        </div>

        {navLinks}

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer min-h-[40px]"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>
    </>
  );
}
