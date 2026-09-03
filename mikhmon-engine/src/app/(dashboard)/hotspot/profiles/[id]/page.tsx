"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sharedUsers: "1",
    rateLimit: "",
    sessionTimeout: "",
    idleTimeout: "",
    keepaliveTimeout: "",
    addressPool: "none",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/hotspot/profiles");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const profile = data.data.find(
            (p: Record<string, string>) => p[".id"] === resolvedParams.id
          );
          if (profile) {
            setFormData({
              name: profile.name || "",
              sharedUsers: profile["shared-users"] || "1",
              rateLimit: profile["rate-limit"] || "",
              sessionTimeout: profile["session-timeout"] || "",
              idleTimeout: profile["idle-timeout"] || "",
              keepaliveTimeout: profile["keepalive-timeout"] || "",
              addressPool: profile["address-pool"] || "none",
            });
          } else {
            toast.error("Profil introuvable");
            router.push("/hotspot/profiles");
          }
        }
      } catch (err) {
        toast.error("Erreur lors du chargement du profil");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [resolvedParams.id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Le nom du profil est requis");
      return;
    }

    setSaving(true);
    try {
      const profileData: Record<string, string> = {
        id: resolvedParams.id,
        name: formData.name.replace(/\s+/g, "-"),
        "shared-users": formData.sharedUsers,
      };

      if (formData.rateLimit) {
        profileData["rate-limit"] = formData.rateLimit;
      }

      if (formData.sessionTimeout) {
        profileData["session-timeout"] = formData.sessionTimeout;
      }

      if (formData.idleTimeout) {
        profileData["idle-timeout"] = formData.idleTimeout;
      }

      if (formData.keepaliveTimeout) {
        profileData["keepalive-timeout"] = formData.keepaliveTimeout;
      }

      if (formData.addressPool !== "none") {
        profileData["address-pool"] = formData.addressPool;
      }

      const res = await fetch("/api/hotspot/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Profil mis à jour avec succès");
        router.push("/hotspot/profiles");
      } else {
        toast.error(data.error || "Échec de la mise à jour");
      }
    } catch {
      toast.error("Échec de la mise à jour du profil");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Modifier le Profil Hotspot : {formData.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push("/hotspot/profiles")}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Retour
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    Enregistrer les modifications
                  </Button>
                </div>

                <table className="w-full">
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-3 pr-4 align-middle w-40 font-medium">Nom du profil</td>
                      <td className="py-3">
                        <Input
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-middle font-medium">Pool d'adresses IP</td>
                      <td className="py-3">
                        <Select
                          value={formData.addressPool}
                          onValueChange={(value) =>
                            setFormData({ ...formData, addressPool: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">none</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-middle font-medium">Utilisateurs partagés</td>
                      <td className="py-3">
                        <Input
                          type="number"
                          min={1}
                          value={formData.sharedUsers}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sharedUsers: e.target.value,
                            })
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-middle font-medium">Limite de débit (Rate Limit)</td>
                      <td className="py-3">
                        <Input
                          value={formData.rateLimit}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rateLimit: e.target.value,
                            })
                          }
                          placeholder="ex: 1M/2M ou 512k/512k"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-middle font-medium">
                        Timeout de Session
                      </td>
                      <td className="py-3">
                        <Input
                          value={formData.sessionTimeout}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sessionTimeout: e.target.value,
                            })
                          }
                          placeholder="ex: 1h, 30m, 1d"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-middle font-medium">Timeout d'Inactivité (Idle)</td>
                      <td className="py-3">
                        <Input
                          value={formData.idleTimeout}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              idleTimeout: e.target.value,
                            })
                          }
                          placeholder="ex: 5m, 10m"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-middle font-medium">
                        Timeout Keepalive
                      </td>
                      <td className="py-3">
                        <Input
                          value={formData.keepaliveTimeout}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              keepaliveTimeout: e.target.value,
                            })
                          }
                          placeholder="ex: 2m"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
