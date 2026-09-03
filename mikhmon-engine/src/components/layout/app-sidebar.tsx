"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCog,
  Radio,
  Wifi,
  Cookie,
  Link as LinkIcon,
  Laptop,
  KeyRound,
  Settings,
  Activity,
  Network,
  DollarSign,
  FileText,
  Ticket,
  ChevronDown,
  Printer,
  Clock,
  Power,
  AreaChart,
  Upload,
  Edit,
  Info,
  List,
  PlusSquare,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { APP_NAME } from "@/lib/constants";

type MenuItem = {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
};

const menuItems: MenuItem[] = [
  { title: "Tableau de bord", href: "/", icon: LayoutDashboard },
  {
    title: "Hotspot",
    icon: Wifi,
    items: [
      { title: "Utilisateurs", href: "/hotspot/users", icon: List },
      { title: "Ajouter un Utilisateur", href: "/hotspot/users/add", icon: UserPlus },
      { title: "Générateur de Tickets", href: "/hotspot/users/generate", icon: UserPlus },
      { title: "Profils Forfaits", href: "/hotspot/profiles", icon: UserCog },
      { title: "Nouveau Forfait", href: "/hotspot/profiles/add", icon: PlusSquare },
      { title: "Connectés Actifs", href: "/hotspot/active", icon: Radio },
      { title: "Appareils Hôtes", href: "/hotspot/hosts", icon: Laptop },
      { title: "Liaisons IP / MAC", href: "/hotspot/ip-binding", icon: LinkIcon },
      { title: "Sessions Cookies", href: "/hotspot/cookies", icon: Cookie },
    ],
  },
  { title: "Impression Rapide", href: "/quick-print", icon: Printer },
  { title: "Tickets Générés", href: "/vouchers", icon: Ticket },
  {
    title: "Journaux & Logs",
    icon: FileText,
    items: [
      { title: "Logs Hotspot", href: "/log/hotspot", icon: Wifi },
      { title: "Logs Utilisateurs", href: "/log/user", icon: Users },
    ],
  },
  {
    title: "Système",
    icon: Settings,
    items: [
      { title: "Tâches Planifiées", href: "/system/scheduler", icon: Clock },
      { title: "Redémarrer le Routeur", href: "/system/reboot", icon: Power },
      { title: "Éteindre le Routeur", href: "/system/shutdown", icon: Power },
    ],
  },
  {
    title: "PPP / VPN",
    icon: KeyRound,
    items: [
      { title: "Comptes Secrets", href: "/ppp/secrets", icon: KeyRound },
      { title: "Profils PPP", href: "/ppp/profiles", icon: Settings },
      { title: "Connexions Actives", href: "/ppp/active", icon: Activity },
    ],
  },
  { title: "Baux DHCP", href: "/dhcp", icon: Network },
  { title: "Moniteur de Trafic", href: "/traffic", icon: AreaChart },
  { title: "Rapport des Ventes", href: "/report", icon: DollarSign },
  {
    title: "Paramètres",
    icon: Settings,
    items: [
      { title: "Paramètres de Session", href: "/settings/session", icon: Settings },
      { title: "Gestion des Routeurs", href: "/sessions", icon: Settings },
      { title: "Logo Hotspot", href: "/settings/logo", icon: Upload },
      { title: "Modèle de Ticket", href: "/settings/template", icon: Edit },
    ],
  },
  { title: "À propos", href: "/about", icon: Info },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center border-b px-4">
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center gap-2 font-black text-slate-900 dark:text-white"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <Wifi className="h-4 w-4" />
          </div>
          <span className="truncate">{APP_NAME}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-10 text-xs font-semibold cursor-pointer">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="pl-4 space-y-0.5">
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.href} className="h-9 text-xs">
                                <Link href={subItem.href} onClick={handleLinkClick} className="cursor-pointer">
                                  <subItem.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} className="h-10 text-xs font-semibold">
                      <Link href={item.href!} onClick={handleLinkClick} className="cursor-pointer">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <p className="text-[11px] text-muted-foreground font-mono">{APP_NAME} Cloud</p>
      </SidebarFooter>
    </Sidebar>
  );
}
