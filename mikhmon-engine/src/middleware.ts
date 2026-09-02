import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  let space: string | null = null;

  // 1. Détection via query param ?space=...
  const querySpace = url.searchParams.get("space");
  if (querySpace && querySpace.trim()) {
    space = querySpace.trim().toLowerCase();
  }

  // 2. Détection via sous-domaine Host (ex: siramanass.mikroot.net ou siramanass.localhost:8080)
  if (!space) {
    const host = request.headers.get("host") || "";
    if (host.includes(".mikroot.net") || host.includes(".localhost")) {
      const sub = host.split(".")[0];
      if (sub && sub !== "www" && sub !== "localhost") {
        space = sub.toLowerCase();
      }
    }
  }

  // 3. Détection via cookie existant
  if (!space) {
    const cookieSpace = request.cookies.get("mikroot_space")?.value;
    if (cookieSpace && cookieSpace.trim()) {
      space = cookieSpace.trim().toLowerCase();
    }
  }

  const response = NextResponse.next();

  // Si un espace a été identifié, propager le header et le cookie
  if (space) {
    response.headers.set("x-tenant-space", space);
    response.cookies.set("mikroot_space", space, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, _next, favicon
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
