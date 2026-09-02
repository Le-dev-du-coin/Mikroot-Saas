import { cookies, headers } from "next/headers";

/**
 * Résout le nom du tenant (espace Mikhmon) à partir de la requête ou du contexte RSC/API.
 */
export async function getActiveTenant(req?: Request): Promise<string> {
  // 1. Si requête API explicite avec paramètre URL ?space=...
  if (req) {
    try {
      const url = new URL(req.url);
      const qSpace = url.searchParams.get("space");
      if (qSpace && qSpace.trim()) return qSpace.trim().toLowerCase();

      // Vérifier header x-tenant-space
      const headerSpace = req.headers.get("x-tenant-space");
      if (headerSpace && headerSpace.trim()) return headerSpace.trim().toLowerCase();

      // Vérifier l'en-tête Referer
      const referer = req.headers.get("referer");
      if (referer) {
        const refUrl = new URL(referer);
        const refSpace = refUrl.searchParams.get("space");
        if (refSpace && refSpace.trim()) return refSpace.trim().toLowerCase();
        const refParts = refUrl.hostname.split(".");
        if (refParts.length >= 3 || (refParts.length === 2 && refParts[1] === "localhost")) {
          const sub = refParts[0].toLowerCase();
          if (!["www", "localhost", "app", "api", "vpn", "admin"].includes(sub)) return sub;
        }
      }

      // Vérifier l'en-tête Host
      const host = (req.headers.get("host") || "").split(":")[0];
      const hostParts = host.split(".");
      if (hostParts.length >= 3 || (hostParts.length === 2 && hostParts[1] === "localhost")) {
        const sub = hostParts[0].toLowerCase();
        if (!["www", "localhost", "app", "api", "vpn", "admin"].includes(sub)) return sub;
      }
    } catch {}
  }

  // 2. Header 'x-tenant-space' injecté par le middleware / Nginx
  try {
    const headersList = await headers();
    const xSpace = headersList.get("x-tenant-space");
    if (xSpace && xSpace.trim()) {
      return xSpace.trim().toLowerCase();
    }
    const referer = headersList.get("referer");
    if (referer) {
      const refUrl = new URL(referer);
      const refSpace = refUrl.searchParams.get("space");
      if (refSpace && refSpace.trim()) return refSpace.trim().toLowerCase();
      const refParts = refUrl.hostname.split(".");
      if (refParts.length >= 3 || (refParts.length === 2 && refParts[1] === "localhost")) {
        const sub = refParts[0].toLowerCase();
        if (!["www", "localhost", "app", "api", "vpn", "admin"].includes(sub)) return sub;
      }
    }
    const host = (headersList.get("host") || "").split(":")[0];
    const hostParts = host.split(".");
    if (hostParts.length >= 3 || (hostParts.length === 2 && hostParts[1] === "localhost")) {
      const sub = hostParts[0].toLowerCase();
      if (!["www", "localhost", "app", "api", "vpn", "admin"].includes(sub)) {
        return sub;
      }
    }
  } catch {}

  // 3. Cookie 'mikroot_space'
  try {
    const cookieStore = await cookies();
    const cookieSpace = cookieStore.get("mikroot_space")?.value;
    if (cookieSpace && cookieSpace.trim()) {
      return cookieSpace.trim().toLowerCase();
    }
  } catch {}

  return "default";
}
