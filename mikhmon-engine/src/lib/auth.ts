import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const defaultAdminUser = process.env.ADMIN_USERNAME || "admin";
        const defaultAdminPass = process.env.ADMIN_PASSWORD || "mikroot2026";

        // 1. Vérification avec les identifiants d'environnement Mikroot
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

        // 2. Vérification dynamique avec les configurations provisionnées dans data/routers.json
        try {
          const { promises: fs } = await import("fs");
          const path = await import("path");
          const configPath = path.join(process.cwd(), "data", "routers.json");
          const fileExists = await fs.stat(configPath).then(() => true).catch(() => false);

          if (fileExists) {
            const raw = await fs.readFile(configPath, "utf-8");
            const parsed = JSON.parse(raw);
            if (
              parsed?.admin &&
              credentials?.username === parsed.admin.username &&
              credentials?.password === parsed.admin.password
            ) {
              return {
                id: "1",
                name: parsed.admin.username,
                email: `${parsed.admin.username}@mikroot.net`,
              };
            }
          }
        } catch {
          // Ignorer l'erreur de lecture locale
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
