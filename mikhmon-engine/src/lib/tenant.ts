import { cookies, headers } from "next/headers";

/**
 * Résout le nom du tenant (espace Mikhmon) à partir de la requête.
 * 1. Cookie 'mikroot_space'
 * 2. Sous-domaine depuis l'en-tête 'Host' (ex: siramanass.mikroot.net -> siramanass)
 * 3. Fallback: 'default'
 */
export async function getActiveTenant(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieSpace = cookieStore.get("mikroot_space")?.value;
    if (cookieSpace && cookieSpace.trim()) {
      return cookieSpace.trim().toLowerCase();
    }
  } catch {
    // Hors contexte RSC ou dans un environnement client
  }

  try {
    const headersList = await headers();
    const host = headersList.get("host") || "";
    if (host.includes(".mikroot.net") || host.includes(".localhost")) {
      const sub = host.split(".")[0];
      if (sub && sub !== "www" && sub !== "localhost") {
        return sub.toLowerCase();
      }
    }
  } catch {
    // Ignorer
  }

  return "default";
}
