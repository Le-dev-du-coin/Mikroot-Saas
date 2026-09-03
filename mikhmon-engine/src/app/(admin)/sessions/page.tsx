"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Server,
  Settings,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  User,
  Eye,
  EyeOff,
  Globe,
  Wifi,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { MikrotikRouter } from "@/types";

export default function SessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [routers, setRouters] = useState<MikrotikRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [spaceName, setSpaceName] = useState<string>("");
  const [adminForm, setAdminForm] = useState({
    username: "",
    password: "",
  });
  const [savingAdmin, setSavingAdmin] = useState(false);

  async function fetchRouters(space?: string) {
    setLoading(true);
    try {
      const targetSpace = space !== undefined ? space : spaceName;
      const apiUrl = targetSpace
        ? `/api/routers?space=${encodeURIComponent(targetSpace)}`
        : "/api/routers";
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (data.success) {
        setRouters(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch routers:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Détecter l'espace actif
    let detectedSpace = searchParams.get("space") || "";
    if (!detectedSpace && typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.includes(".mikroot.net") || host.includes(".localhost")) {
        const sub = host.split(".")[0];
        if (sub && sub !== "www" && sub !== "localhost") {
          detectedSpace = sub;
        }
      }
      if (!detectedSpace) {
        const match = document.cookie.match(/mikroot_space=([^;]+)/);
        if (match) detectedSpace = match[1];
      }
    }

    if (detectedSpace) {
      setSpaceName(detectedSpace);
      document.cookie = `mikroot_space=${detectedSpace}; path=/; max-age=2592000; SameSite=Lax`;
    }

    fetchRouters(detectedSpace);
    setAdminForm({
      username: "admin",
      password: "",
    });
  }, [searchParams]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le routeur "${name}" ?`)) return;

    try {
      const targetSpace = spaceName ? `?space=${encodeURIComponent(spaceName)}` : "";
      const res = await fetch(`/api/routers/${id}${targetSpace}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success("Routeur supprimé avec succès");
        fetchRouters();
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  async function handleConnect(routerId: string) {
    setConnecting(routerId);
    try {
      const targetSpace = spaceName ? `?space=${encodeURIComponent(spaceName)}` : "";
      const res = await fetch(`/api/routers/${routerId}/connect${targetSpace}`, {
        method: "POST",
      });
      const result = await res.json();
      if (result.success) {
        sessionStorage.setItem("activeRouter", routerId);
        const targetUrl = spaceName ? `/?space=${encodeURIComponent(spaceName)}` : "/";
        router.push(targetUrl);
      } else {
        toast.error(result.error || "Connexion au routeur échouée");
      }
    } catch {
      toast.error("Connexion au routeur échouée");
    } finally {
      setConnecting(null);
    }
  }

  async function handleSaveAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdmin(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Identifiants mis à jour");
        if (result.requireRelogin) {
          await signOut({ redirect: false });
          window.location.href = "/login";
        }
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingAdmin(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-2xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-xl" />
                    <Skeleton className="h-9 w-9 rounded-xl" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-xl" />
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Wifi className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-black text-slate-950 dark:text-white tracking-tight">
              Sessions de Routeurs
            </h1>
            {spaceName && (
              <span className="ml-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold border border-blue-200 dark:border-blue-800">
                Espace : {spaceName}.mikroot.net
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sélectionnez une session pour accéder à la gestion des tickets et utilisateurs Hotspot.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRouters()}
          className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer gap-1.5 self-start sm:self-center"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Actualiser</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Router List Card */}
        <Card className="rounded-3xl border-slate-200/90 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Routeurs Liés ({routers.length})</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {routers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1.5">
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Aucun routeur dans cet espace
                </p>
                <p className="text-slate-400 max-w-xs mx-auto">
                  Ajoutez un routeur depuis votre portail Mikroot SaaS pour le voir apparaître instantanément ici.
                </p>
              </div>
            ) : (
              routers.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-50/70 dark:bg-slate-800/90 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-950 dark:text-white truncate">
                        {r.hotspotName || r.name}
                      </p>
                      <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{r.host}:{r.port}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer gap-1.5"
                      onClick={() => handleConnect(r.id)}
                      disabled={connecting === r.id}
                    >
                      {connecting === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      <span>Ouvrir</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-750 cursor-pointer"
                      onClick={() =>
                        router.push(`/router/${r.id}${spaceName ? `?space=${spaceName}` : ""}`)
                      }
                      title="Modifier les paramètres du routeur"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      onClick={() => handleDelete(r.id, r.name)}
                      title="Supprimer la session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Admin Settings Card */}
        <Card className="rounded-3xl border-slate-200/90 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Accès Administrateur de l'Espace</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-username"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Nom d'utilisateur
                </Label>
                <Input
                  id="admin-username"
                  value={adminForm.username}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, username: e.target.value })
                  }
                  className="rounded-xl h-11 bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Mot de passe
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={adminForm.password}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, password: e.target.value })
                    }
                    placeholder="Saisir un nouveau mot de passe"
                    className="rounded-xl h-11 bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-sm font-medium"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-11 w-11 border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingAdmin}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20 mt-2"
              >
                {savingAdmin ? "Enregistrement en cours..." : "Enregistrer les modifications"}
              </Button>

              <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Modifications appliquées uniquement à cet espace</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
