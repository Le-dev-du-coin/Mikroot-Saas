import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  "/",
  "/sessions",
  "/settings",
  "/hotspot",
  "/ppp",
  "/dhcp",
  "/reports",
  "/voucher",
  "/router",
  "/traffic",
  "/log",
  "/system",
  "/quick-print",
  "/about",
];

const protectedApiRoutes = [
  "/api/routers",
  "/api/hotspot",
  "/api/ppp",
  "/api/dashboard",
  "/api/traffic",
  "/api/interfaces",
  "/api/logs",
  "/api/system",
  "/api/quick-print",
  "/api/test-connection",
];

const publicRoutes = ["/login"];
const publicApiRoutes = ["/api/auth"];

// Security headers for all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  // Détection du Tenant Space
  let space: string | null = null;
  const querySpace = url.searchParams.get("space");
  if (querySpace && querySpace.trim()) {
    space = querySpace.trim().toLowerCase();
  }

  if (!space) {
    const nginxTenant = request.headers.get("x-tenant-space");
    if (nginxTenant && nginxTenant.trim()) {
      space = nginxTenant.trim().toLowerCase();
    }
  }

  if (!space) {
    const host = (request.headers.get("host") || "").split(":")[0];
    const parts = host.split(".");
    // Support universel de tout nom de domaine (ex: espace.mikroot.app, espace.mondomaine.com, espace.localhost)
    if (parts.length >= 3 || (parts.length === 2 && parts[1] === "localhost")) {
      const sub = parts[0].toLowerCase();
      if (!["www", "localhost", "app", "api", "vpn", "admin"].includes(sub)) {
        space = sub;
      }
    }
  }

  if (!space) {
    const cookieSpace = request.cookies.get("mikroot_space")?.value;
    if (cookieSpace && cookieSpace.trim()) {
      space = cookieSpace.trim().toLowerCase();
    }
  }

  // Check if it's an API route
  const isApiRoute = path.startsWith("/api/");

  // Check protected routes
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
  const isProtectedApiRoute = protectedApiRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );

  // Check public routes
  const isPublicRoute = publicRoutes.includes(path);
  const isPublicApiRoute = publicApiRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );

  // Get session token from cookies
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  // Helper pour injecter les headers et cookies de tenant
  const applyTenantAndSecurity = (res: NextResponse) => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
    if (space) {
      res.headers.set("x-tenant-space", space);
      res.cookies.set("mikroot_space", space, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 jours
        sameSite: "lax",
      });
    }
    return res;
  };

  // Handle API routes
  if (isApiRoute) {
    // Allow public API routes
    if (isPublicApiRoute) {
      return applyTenantAndSecurity(NextResponse.next());
    }

    // Block protected API routes if not logged in
    if (isProtectedApiRoute && !isLoggedIn) {
      return applyTenantAndSecurity(
        NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    return applyTenantAndSecurity(NextResponse.next());
  }

  // Handle page routes
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.nextUrl);
    if (space) loginUrl.searchParams.set("space", space);
    return applyTenantAndSecurity(NextResponse.redirect(loginUrl));
  }

  if (isPublicRoute && isLoggedIn) {
    const sessionsUrl = new URL("/sessions", request.nextUrl);
    if (space) sessionsUrl.searchParams.set("space", space);
    return applyTenantAndSecurity(NextResponse.redirect(sessionsUrl));
  }

  return applyTenantAndSecurity(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, metadata
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.ico$|.*\\.svg$).*)",
  ],
};
