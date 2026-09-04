import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/session";
import { withRateLimit } from "@/lib/rate-limit";

const checkWriteRateLimit = withRateLimit("api");

function generateChars(length: number, mode: string): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";

  let chars = "";
  switch (mode) {
    case "lower":
      chars = lower;
      break;
    case "upper":
      chars = upper;
      break;
    case "upplow":
      chars = lower + upper;
      break;
    case "mix":
      chars = lower + nums;
      break;
    case "mix1":
      chars = upper + nums;
      break;
    case "mix2":
      chars = lower + upper + nums;
      break;
    case "num":
      chars = nums;
      break;
    default:
      chars = lower + nums;
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  const rateLimit = checkWriteRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Trop de requêtes en cours. Réessayez dans un instant." },
      { status: 429, headers: rateLimit.headers }
    );
  }

  const { client, error } = await getAuthenticatedClient();
  if (!client) {
    return NextResponse.json(
      { success: false, error: error || "Non connecté à MikroTik" },
      { status: 401, headers: rateLimit.headers }
    );
  }

  try {
    const body = await request.json();
    const {
      qty = 1,
      server = "all",
      userMode = "vc",
      userLength = 4,
      prefix = "",
      charMode = "mix",
      profile,
      timeLimit,
      dataLimit,
      dataUnit = "1048576",
      price = "",
      comment = "",
    } = body;

    const count = parseInt(qty);
    if (isNaN(count) || count < 1 || count > 500) {
      await client.disconnect();
      return NextResponse.json(
        { success: false, error: "La quantité doit être comprise entre 1 et 500" },
        { status: 400, headers: rateLimit.headers }
      );
    }

    if (!profile) {
      await client.disconnect();
      return NextResponse.json(
        { success: false, error: "Le profil est obligatoire" },
        { status: 400, headers: rateLimit.headers }
      );
    }

    const dateStr = new Date()
      .toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      })
      .replace(/\//g, ".");
    const genCode = Math.floor(Math.random() * 900 + 100);
    const priceTag = price && String(price).trim() ? `_P${String(price).trim().replace(/[^0-9]/g, "")}` : "";
    const commentBase = `gen-${genCode}-${dateStr}${priceTag}${comment ? `-${comment.trim()}` : ""}`;

    let successCount = 0;
    let failCount = 0;

    // Calcul limite données
    let limitBytesTotal: string | undefined = undefined;
    if (dataLimit && parseInt(dataLimit) > 0) {
      const bytes = parseInt(dataLimit) * parseInt(dataUnit);
      limitBytesTotal = bytes.toString();
    }

    // Exécution batch optimisée sur le socket MikroTik
    for (let i = 0; i < count; i++) {
      const chars = generateChars(parseInt(userLength) || 4, charMode);
      const username = (prefix || "") + chars;
      const password = userMode === "vc" ? username : generateChars(parseInt(userLength) || 4, "num");

      const userParams: Record<string, string> = {
        name: username,
        password: password,
        profile: profile,
        comment: commentBase,
      };

      if (server && server !== "all") {
        userParams.server = server;
      }

      if (timeLimit && timeLimit.trim()) {
        userParams["limit-uptime"] = timeLimit.trim();
      }

      if (limitBytesTotal) {
        userParams["limit-bytes-total"] = limitBytesTotal;
      }

      try {
        await client.addHotspotUser(userParams);
        successCount++;
      } catch (err) {
        console.error(`Erreur création utilisateur ${username}:`, err);
        failCount++;
      }
    }

    await client.disconnect();

    return NextResponse.json(
      {
        success: true,
        count: successCount,
        failed: failCount,
        comment: commentBase,
        message: `${successCount} ticket(s) généré(s) avec succès`,
      },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("Erreur génération en masse:", error);
    try {
      await client.disconnect();
    } catch {}
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de la génération des tickets" },
      { status: 500, headers: rateLimit.headers }
    );
  }
}
