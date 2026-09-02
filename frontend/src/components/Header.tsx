"use client";

import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { formatFCFA } from "@/lib/utils";
import { Menu, Plus, Wallet } from "lucide-react";
import Link from "next/link";

export default function Header({
  balance = null,
  onOpenSidebar,
}: {
  balance?: number | null;
  onOpenSidebar: () => void;
}) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between">
        {/* Left: Mobile menu toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Espace d'Exploitation</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gérez vos routeurs et espaces en ligne</p>
          </div>
        </div>

        {/* Right Area: Actions & Balance */}
        <div className="flex items-center gap-2.5">
          <LangToggle />
          <ThemeToggle />

          <Link
            href="/dashboard/routers/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Routeur</span>
          </Link>

          <Link
            href="/dashboard/wallet"
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors min-h-[34px]"
          >
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {balance !== null && balance !== undefined ? (
              <span>{formatFCFA(balance)}</span>
            ) : (
              <span className="inline-block w-16 h-4 bg-emerald-200/60 dark:bg-emerald-900/60 rounded animate-pulse" />
            )}
          </Link>

          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
            {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
