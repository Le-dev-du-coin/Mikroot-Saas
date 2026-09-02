import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        const space = credentials?.space ? String(credentials.space).toLowerCase() : undefined;

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
  },
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
});
