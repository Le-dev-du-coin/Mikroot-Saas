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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { MikrotikRouter } from "@/types";

const COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-cyan-500",
];

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
      const apiUrl = targetSpace ? `/api/routers?space=${encodeURIComponent(targetSpace)}` : "/api/routers";
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
    // 1. Détecter l'espace actif
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
        // Lire le cookie
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
          signOut({ callbackUrl: "/login" });
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
          {/* Router List Skeleton */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-14" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Admin Settings Skeleton */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold md:text-xl">Sessions de Routeurs</h1>
          {spaceName && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold border border-blue-200 dark:border-blue-800">
              Espace : {spaceName}.mikroot.net
            </span>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => fetchRouters()} className="cursor-pointer gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Actualiser</span>
        </Button>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Router List */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-600" />
                <span>Routeurs Liés à cet Espace ({routers.length})</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {routers.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Aucun routeur trouvé pour cet espace.</p>
                <p className="text-slate-400">Ajoutez un routeur depuis votre portail Mikroot SaaS pour le voir apparaître ici.</p>
              </div>
            ) : (
              routers.map((r, index) => (
                <div
                  key={r.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${COLORS[index % COLORS.length]} bg-opacity-10 dark:bg-slate-900 border-slate-200 dark:border-slate-800`}
                >
                  <div className="flex items-start gap-3 sm:items-center min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${COLORS[index % COLORS.length]} text-white shadow-xs`}
                    >
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {r.hotspotName || r.name}
                      </p>
                      <p className="truncate text-xs font-mono text-slate-500 dark:text-slate-400">
                        {r.host}:{r.port}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                      onClick={() => handleConnect(r.id)}
                      disabled={connecting === r.id}
                    >
                      {connecting === r.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-1 h-3 w-3" />
                      )}
                      <span>Ouvrir</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs rounded-xl cursor-pointer"
                      onClick={() => router.push(`/router/${r.id}${spaceName ? `?space=${spaceName}` : ""}`)}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive hover:text-destructive rounded-xl cursor-pointer"
                      onClick={() => handleDelete(r.id, r.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Admin Settings */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-blue-600" />
              <span>Accès Administrateur de l'Espace</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-username" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Nom d'utilisateur
                </Label>
                <Input
                  id="admin-username"
                  value={adminForm.username}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, username: e.target.value })
                  }
                  className="rounded-xl h-10 bg-slate-50 dark:bg-slate-850"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
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
                    className="rounded-xl h-10 bg-slate-50 dark:bg-slate-850"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-10 w-10 cursor-pointer shrink-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={savingAdmin} className="rounded-xl h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer">
                  {savingAdmin ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
