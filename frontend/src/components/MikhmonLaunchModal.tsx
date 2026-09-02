"use client";

import CopyButton from "@/components/CopyButton";
import { InstanceData, RouterData } from "@/lib/api";
import { BASE_DOMAIN } from "@/lib/config";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Info,
  KeyRound,
  Maximize2,
  Router as RouterIcon,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";
import { useState } from "react";

interface MikhmonLaunchModalProps {
  instance: InstanceData;
  onClose: () => void;
}

export default function MikhmonLaunchModal({
  instance,
  onClose,
}: MikhmonLaunchModalProps) {
  const [activeTab, setActiveTab] = useState<"CONFIG" | "EMBED">("CONFIG");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const routers = instance.routers || [];
  const adminUser = instance.admin_user || "admin";
  const adminPass = instance.admin_password || "mikroot2026";

  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const directLaunchUrl = isLocalDev
    ? `http://localhost:8080/?space=${instance.name}`
    : (instance.subdomain_url || `https://${instance.name}.${BASE_DOMAIN}`);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {instance.name}.{BASE_DOMAIN}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ROS {instance.routeros_version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instance Mikhmon-Next dédiée & Paramètres de connexion MikroTik
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveTab("CONFIG")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "CONFIG"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Paramètres & Sessions Routeurs</span>
          </button>

          <button
            onClick={() => setActiveTab("EMBED")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "EMBED"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Visualiseur Intégré (iFrame)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === "CONFIG" ? (
            <>
              {/* Top Action Box */}
              <div className="p-4 bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 rounded-3xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      Lien direct vers votre Mikhmon-Next
                    </span>
                    <div className="font-mono text-xs sm:text-sm font-black text-blue-950 dark:text-blue-200 mt-0.5">
                      {directLaunchUrl}
                    </div>
                  </div>

                  <a
                    href={directLaunchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
                  >
                    <span>Ouvrir mon Mikhmon</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Identifiants de connexion Mikhmon
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Nom d'utilisateur
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                        {adminUser}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(adminUser, "user")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      title="Copier le nom d'utilisateur"
                    >
                      {copiedKey === "user" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Mot de passe
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                        {adminPass}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(adminPass, "pass")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      title="Copier le mot de passe"
                    >
                      {copiedKey === "pass" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sessions Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Paramètres de session à renseigner dans Mikhmon ({routers.length})
                  </h4>
                </div>

                {routers.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                    Aucun routeur n'est encore lié à cet espace. Ajoutez d'abord un routeur dans votre tableau de bord pour obtenir ses ports de connexion dédiés.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routers.map((router) => {
                      const apiPort = router.vpn?.api_port || 41001;
                      const winboxPort = router.vpn?.winbox_port || 51001;
                      const endpointCustom = `${instance.name}.${BASE_DOMAIN}:${apiPort}`;
                      const endpointVpn = `vpn.${BASE_DOMAIN}:${apiPort}`;

                      return (
                        <div
                          key={router.id}
                          className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <RouterIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                Routeur : {router.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              Port API {apiPort}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                            {/* Combined Host:Port Blocks */}
                            <div
                              onClick={() => handleCopy(endpointCustom, `ep-${router.id}`)}
                              className="p-3 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer flex items-center justify-between"
                              title="Cliquez pour copier l'IP MikroTik avec le port"
                            >
                              <div className="min-w-0">
                                <span className="block text-[9px] font-sans text-slate-500 dark:text-slate-400 uppercase font-bold">
                                  IP MikroTik & Port (Host:Port)
                                </span>
                                <span className="font-bold text-blue-600 dark:text-blue-400 truncate block">
                                  {endpointCustom}
                                </span>
                              </div>
                              <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                            </div>

                            <div
                              onClick={() => handleCopy(router.name, `name-${router.id}`)}
                              className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-between"
                              title="Cliquez pour copier le nom de session"
                            >
                              <div className="min-w-0">
                                <span className="block text-[9px] font-sans text-slate-400 uppercase font-bold">
                                  Session Name (Nom de session)
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white truncate block">
                                  {router.name}
                                </span>
                              </div>
                              <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            Dans Mikhmon : collez <strong>{endpointCustom}</strong> dans le champ <em>IP MikroTik</em> et renseignez vos identifiants admin RouterOS.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Rendu direct de l'instance Mikhmon</span>
                <a
                  href={instance.subdomain_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Plein écran</span>
                  <Maximize2 className="w-3 h-3" />
                </a>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 h-[450px]">
                <iframe
                  src={instance.subdomain_url}
                  title={`Mikhmon ${instance.name}`}
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Chiffrement SSL & Accès Cloud Sécurisé</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
