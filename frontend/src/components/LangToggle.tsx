"use client";

import { Globe } from "lucide-react";
import { useEffect, useState } from "react";

export default function LangToggle() {
  const [lang, setLang] = useState<"FR" | "EN">("FR");

  useEffect(() => {
    const saved = localStorage.getItem("mikroot_lang") as "FR" | "EN";
    if (saved) setLang(saved);
  }, []);

  const toggleLang = () => {
    const nextLang = lang === "FR" ? "EN" : "FR";
    setLang(nextLang);
    localStorage.setItem("mikroot_lang", nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLang}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
      title="Changer de langue (FR / EN)"
    >
      <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      <span>{lang}</span>
    </button>
  );
}
