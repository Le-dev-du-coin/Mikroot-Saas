import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveTenant } from "@/lib/tenant";
import fs from "fs/promises";
import path from "path";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Non autorisé" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !username.trim()) {
      return NextResponse.json(
        { success: false, error: "Le nom d'utilisateur est requis" },
        { status: 400 }
      );
    }

    const space = await getActiveTenant(request);

    if (space) {
      const tenantConfigPath = path.join(process.cwd(), "data", "tenants", `${space}.json`);
      try {
        const raw = await fs.readFile(tenantConfigPath, "utf-8");
        const config = JSON.parse(raw);
        config.admin = config.admin || {};
        config.admin.username = username.trim();
        if (password && password.trim()) {
          config.admin.password = password.trim();
        }
        await fs.writeFile(tenantConfigPath, JSON.stringify(config, null, 2), "utf-8");
        return NextResponse.json({
          success: true,
          requireRelogin: true,
          message: "Identifiants mis à jour avec succès",
        });
      } catch (err) {
        console.error("Erreur sauvegarde tenant config:", err);
      }
    }

    return NextResponse.json({
      success: true,
      requireRelogin: false,
      message: "Identifiants enregistrés",
    });
  } catch (error) {
    console.error("API Admin error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
