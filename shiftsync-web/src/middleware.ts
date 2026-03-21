import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const ACCESS_TOKEN_COOKIE = "accessToken";
const SESSION_COOKIE = "session";

/** Routes that require a specific permission (path prefix -> permission). */
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/audit": "audit:view",
  "/staff": "users:view",
  "/analytics": "analytics:view",
  "/locations": "locations:view",
  "/skills": "skills:view",
  "/schedule": "shifts:view",
  "/swaps": "swaps:view",
  "/on-duty": "locations:view",
  "/notifications": "notifications:view",
};

function getSessionFromRequest(
  req: NextRequest,
): { features: string[] } | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session = JSON.parse(decodeURIComponent(raw)) as {
      features?: string[];
    };
    return session?.features ? { features: session.features } : null;
  } catch {
    return null;
  }
}

function hasPermission(
  session: { features: string[] } | null,
  permission: string,
): boolean {
  return session?.features?.includes(permission) ?? false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // Public: login page and static assets
  if (pathname === LOGIN_PATH) {
    if (accessToken) {
      const returnUrl = req.nextUrl.searchParams.get("returnUrl") ?? "/";
      return NextResponse.redirect(new URL(returnUrl, req.url));
    }
    return NextResponse.next();
  }

  // Skip middleware for non-page routes (api, _next, static files)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Require auth for all other routes
  if (!accessToken) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Route-level permission checks
  for (const [pathPrefix, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`)) {
      const session = getSessionFromRequest(req);
      if (!hasPermission(session, permission)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
