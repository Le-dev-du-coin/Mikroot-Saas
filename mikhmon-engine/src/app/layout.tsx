import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider, SessionProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "Mikroot Hotspot - Gestionnaire MikroTik",
  description: "Système de Gestion Hotspots MikroTik et Impression de Tickets Mikroot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
