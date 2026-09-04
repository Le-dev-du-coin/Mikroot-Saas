import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "mikroot-super-secret-mikhmon-next-auth-key-2026-production",
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        space: { label: "Space", type: "text" },
      },
      async authorize(credentials) {
        const defaultAdminUser = process.env.ADMIN_USERNAME || "admin";
        const defaultAdminPass = process.env.ADMIN_PASSWORD || "mikroot2026";
        let space = credentials?.space ? String(credentials.space).toLowerCase().trim() : undefined;
        if (!space) {
          try {
            const { headers, cookies } = await import("next/headers");
            const headersList = await headers();
            const cookieStore = await cookies();
            const headerSpace = headersList.get("x-tenant-space");
            const cookieSpace = cookieStore.get("mikroot_space")?.value;
            const host = (headersList.get("host") || "").split(":")[0];
            const parts = host.split(".");
            let hostSub: string | undefined = undefined;
            if (parts.length >= 3 || (parts.length === 2 && parts[1] === "localhost")) {
              const sub = parts[0].toLowerCase();
              if (!["www", "localhost", "app", "api", "vpn", "admin"].includes(sub)) {
                hostSub = sub;
              }
            }
            space = headerSpace || cookieSpace || hostSub || undefined;
          } catch {}
        }

        // 1. Vérification dynamique avec le fichier spécifique du tenant/espace dans data/tenants/<space>.json
        if (space) {
          try {
            const { promises: fs } = await import("fs");
            const path = await import("path");
            const tenantConfigPath = path.join(process.cwd(), "data", "tenants", `${space}.json`);
            const fileExists = await fs.stat(tenantConfigPath).then(() => true).catch(() => false);

            if (fileExists) {
              const raw = await fs.readFile(tenantConfigPath, "utf-8");
              const parsed = JSON.parse(raw);
              if (
                parsed?.admin &&
                credentials?.username === parsed.admin.username &&
                credentials?.password === parsed.admin.password
              ) {
                return {
                  id: `tenant-${space}`,
                  name: parsed.admin.username,
                  email: `${parsed.admin.username}@${space}.mikroot.net`,
                };
              }
            }
          } catch {
            // Ignorer
          }
        }

        // 2. Vérification avec les identifiants d'environnement globaux Mikroot
        if (
          credentials?.username === defaultAdminUser &&
          credentials?.password === defaultAdminPass
        ) {
          return {
            id: "1",
            name: defaultAdminUser,
            email: `${defaultAdminUser}@mikroot.net`,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
});
