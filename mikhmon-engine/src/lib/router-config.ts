import { prisma } from "./prisma";
import { encrypt, decrypt } from "./crypto";
import { getActiveTenant } from "./tenant";
import type { MikrotikRouter, RouterConfig } from "@/types";

const isVercel =
  process.env.VERCEL === "1" ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

// Prefix for encrypted passwords to detect if already encrypted
const ENCRYPTED_PREFIX = "enc:";

/**
 * Encrypt password for storage
 */
function encryptPassword(password: string): string {
  if (password.startsWith(ENCRYPTED_PREFIX)) {
    return password; // Already encrypted
  }
  try {
    return ENCRYPTED_PREFIX + encrypt(password);
  } catch (error) {
    console.error("Failed to encrypt password:", error);
    return password; // Fallback to plaintext if encryption fails
  }
}

/**
 * Decrypt password from storage
 */
function decryptPassword(password: string): string {
  if (!password.startsWith(ENCRYPTED_PREFIX)) {
    return password; // Not encrypted (legacy data)
  }
  try {
    return decrypt(password.substring(ENCRYPTED_PREFIX.length));
  } catch (error) {
    console.error("Failed to decrypt password:", error);
    return ""; // Return empty on decryption failure for security
  }
}

function mapRouterFromDB(row: {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  hotspotName: string | null;
  dnsName: string | null;
  currency: string;
  autoReload: number;
  createdAt: Date;
  updatedAt: Date;
}): MikrotikRouter {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    password: decryptPassword(row.password),
    hotspotName: row.hotspotName || "",
    dnsName: row.dnsName || "",
    currency: row.currency,
    autoReload: row.autoReload,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRouterFromFile(router: MikrotikRouter): MikrotikRouter {
  return {
    ...router,
    password: decryptPassword(router.password),
  };
}

async function resolveTenantConfigPath(reqOrTenant?: string | Request): Promise<string> {
  const path = await import("path");
  let tenant: string;
  if (typeof reqOrTenant === "string") {
    tenant = reqOrTenant;
  } else if (reqOrTenant && typeof reqOrTenant === "object") {
    tenant = await getActiveTenant(reqOrTenant);
  } else {
    tenant = await getActiveTenant();
  }
  const tenantDir = path.join(process.cwd(), "data", "tenants");
  return path.join(tenantDir, `${tenant}.json`);
}

async function getRoutersFromFile(reqOrTenant?: string | Request): Promise<MikrotikRouter[]> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const CONFIG_PATH = await resolveTenantConfigPath(reqOrTenant);

  try {
    const dataDir = path.dirname(CONFIG_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(data) as RouterConfig;
    return (config.routers || []).map(mapRouterFromFile);
  } catch {
    const defaultConfig: RouterConfig = {
      admin: { username: "admin", password: "mikroot2026" },
      routers: [],
    };
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return [];
  }
}

async function saveRouterToFile(
  routers: MikrotikRouter[],
  reqOrTenant?: string | Request
): Promise<void> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const CONFIG_PATH = await resolveTenantConfigPath(reqOrTenant);

  // Encrypt passwords before saving
  const encryptedRouters = routers.map((r) => ({
    ...r,
    password: encryptPassword(r.password),
  }));

  let existingAdmin = { username: "admin", password: "mikroot2026" };
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.admin) existingAdmin = parsed.admin;
  } catch {
    // Ignorer
  }

  const config: RouterConfig = {
    admin: existingAdmin,
    routers: encryptedRouters,
  };
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function getRouters(reqOrTenant?: string | Request): Promise<MikrotikRouter[]> {
  if (isVercel) {
    const rows = await prisma.router.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRouterFromDB);
  }
  return getRoutersFromFile(reqOrTenant);
}

export async function getRouter(id: string, reqOrTenant?: string | Request): Promise<MikrotikRouter | null> {
  if (isVercel) {
    const row = await prisma.router.findUnique({ where: { id } });
    if (!row) return null;
    return mapRouterFromDB(row);
  }
  const routers = await getRoutersFromFile(reqOrTenant);
  return routers.find((r) => r.id === id) || null;
}

export async function addRouter(
  router: Omit<MikrotikRouter, "id" | "createdAt" | "updatedAt">,
  reqOrTenant?: string | Request
): Promise<MikrotikRouter> {
  if (isVercel) {
    const created = await prisma.router.create({
      data: {
        name: router.name,
        host: router.host,
        port: router.port,
        username: router.username,
        password: encryptPassword(router.password),
        hotspotName: router.hotspotName,
        dnsName: router.dnsName,
        currency: router.currency,
        autoReload: router.autoReload,
      },
    });
    return mapRouterFromDB(created);
  }

  const newRouter: MikrotikRouter = {
    ...router,
    id: `router-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const routers = await getRoutersFromFile(reqOrTenant);
  routers.push(newRouter);
  await saveRouterToFile(routers, reqOrTenant);
  return newRouter;
}

export async function updateRouter(
  id: string,
  updates: Partial<Omit<MikrotikRouter, "id" | "createdAt">>,
  reqOrTenant?: string | Request
): Promise<MikrotikRouter | null> {
  if (isVercel) {
    try {
      const dataToUpdate = {
        name: updates.name,
        host: updates.host,
        port: updates.port,
        username: updates.username,
        password: updates.password
          ? encryptPassword(updates.password)
          : undefined,
        hotspotName: updates.hotspotName,
        dnsName: updates.dnsName,
        currency: updates.currency,
        autoReload: updates.autoReload,
      };

      const updated = await prisma.router.update({
        where: { id },
        data: dataToUpdate,
      });
      return mapRouterFromDB(updated);
    } catch {
      return null;
    }
  }

  const routers = await getRoutersFromFile(reqOrTenant);
  const index = routers.findIndex((r) => r.id === id);
  if (index === -1) return null;

  routers[index] = {
    ...routers[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveRouterToFile(routers, reqOrTenant);
  return routers[index];
}

export async function deleteRouter(id: string, reqOrTenant?: string | Request): Promise<boolean> {
  if (isVercel) {
    try {
      await prisma.router.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  const routers = await getRoutersFromFile(reqOrTenant);
  const index = routers.findIndex((r) => r.id === id);
  if (index === -1) return false;

  routers.splice(index, 1);
  await saveRouterToFile(routers, reqOrTenant);
  return true;
}
