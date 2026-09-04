"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, X, Sparkles, Printer } from "lucide-react";
import { FormSkeleton } from "@/components/ui/page-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { HotspotUserProfile } from "@/types/routeros";

interface HotspotServer {
  ".id": string;
  name: string;
}

export default function GenerateUsersPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<HotspotUserProfile[]>([]);
  const [servers, setServers] = useState<HotspotServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState({
    qty: 10,
    server: "all",
    userMode: "vc", // vc = user=pass, up = user+pass
    userLength: 6,
    prefix: "",
    charMode: "num", // lower, upper, upplow, mix, mix1, mix2, num
    profile: "",
    timeLimit: "",
    dataLimit: "",
    dataUnit: "1048576", // MB
    comment: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [profilesRes, serversRes] = await Promise.all([
          fetch("/api/hotspot/profiles"),
          fetch("/api/hotspot/servers"),
        ]);
        const [profilesData, serversData] = await Promise.all([
          profilesRes.json(),
          serversRes.json(),
        ]);
        if (profilesData.success) {
          setProfiles(profilesData.data);
          if (profilesData.data.length > 0 && !formData.profile) {
            setFormData((prev) => ({ ...prev, profile: profilesData.data[0].name }));
          }
        }
        if (serversData.success) {
          setServers(serversData.data);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.profile) {
      toast.error("Veuillez sélectionner un forfait / profil");
      return;
    }

    if (formData.qty < 1 || formData.qty > 500) {
      toast.error("La quantité doit être comprise entre 1 et 500");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/hotspot/users/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || `${data.count} tickets générés avec succès !`);
        if (data.comment) {
          router.push(`/hotspot/users?comment=${encodeURIComponent(data.comment)}`);
        } else {
          router.push("/hotspot/users");
        }
      } else {
        toast.error(data.error || "Échec de la génération des tickets");
      }
    } catch {
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/hotspot/users")}
          className="rounded-xl"
        >
          <X className="mr-1.5 h-4 w-4" />
          Fermer
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/hotspot/users")}
          className="rounded-xl"
        >
          <Users className="mr-1.5 h-4 w-4" />
          Liste des Utilisateurs
        </Button>
      </div>

      <form onSubmit={handleGenerate}>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span>Générateur de Tickets en Masse (1 à 500)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">Quantité à générer (Max 500)</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={formData.qty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      qty: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Serveur Hotspot</Label>
                <Select
                  value={formData.server}
                  onValueChange={(value) =>
                    setFormData({ ...formData, server: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">all (Tous les serveurs)</SelectItem>
                    {servers.map((server) => (
                      <SelectItem key={server[".id"]} value={server.name}>
                        {server.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">Format du Ticket (User / Pass)</Label>
                <Select
                  value={formData.userMode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, userMode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vc">Code Unique (User = Pass)</SelectItem>
                    <SelectItem value="up">Deux champs (User + Pass séparé)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Longueur du Code (Caractères)</Label>
                <Select
                  value={formData.userLength.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, userLength: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((len) => (
                      <SelectItem key={len} value={len.toString()}>
                        {len} caractères
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">Préfixe du code (Optionnel)</Label>
                <Input
                  maxLength={6}
                  value={formData.prefix}
                  onChange={(e) =>
                    setFormData({ ...formData, prefix: e.target.value })
                  }
                  placeholder="ex: TK- ou A"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Type de Caractères</Label>
                <Select
                  value={formData.charMode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, charMode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="num">Chiffres uniquement (123456)</SelectItem>
                    <SelectItem value="mix">Minuscules + Chiffres (5ab2c3)</SelectItem>
                    <SelectItem value="mix1">Majuscules + Chiffres (5AB2C3)</SelectItem>
                    <SelectItem value="mix2">Maj + Min + Chiffres (5aB2c3)</SelectItem>
                    <SelectItem value="lower">Minuscules seules (abcd)</SelectItem>
                    <SelectItem value="upper">Majuscules seules (ABCD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">Forfait / Profil Hotspot *</Label>
                <Select
                  value={formData.profile}
                  onValueChange={(value) =>
                    setFormData({ ...formData, profile: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un forfait" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile[".id"]} value={profile.name}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Limite de Temps (Optionnel)</Label>
                <Input
                  value={formData.timeLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, timeLimit: e.target.value })
                  }
                  placeholder="ex: 1h, 3d, 1w"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">Limite de Volume de Données (Optionnel)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={formData.dataLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, dataLimit: e.target.value })
                    }
                    placeholder="ex: 500"
                    className="flex-1"
                  />
                  <Select
                    value={formData.dataUnit}
                    onValueChange={(value) =>
                      setFormData({ ...formData, dataUnit: value })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1048576">MB</SelectItem>
                      <SelectItem value="1073741824">GB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Commentaire du Lot (Optionnel)</Label>
                <Input
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData({ ...formData, comment: e.target.value })
                  }
                  placeholder="ex: Lot-Dimanche"
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/hotspot/users")}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={generating}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl min-w-[160px] cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer {formData.qty} Ticket(s)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
