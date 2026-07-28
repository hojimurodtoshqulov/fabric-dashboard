import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_PERMISSIONS } from "@/constants";
import type { Permission, RoleName } from "@/constants";

// Lightweight NextAuth instance for Edge — no Prisma, no bcrypt
const { auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, token }) {
      session.user.id = (token.id ?? token.sub ?? "") as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).role = (token.role ?? "") as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).permissions = (token.permissions ?? []) as string[];
      return session;
    },
  },
  providers: [],
});

const PUBLIC_ROUTES = ["/login", "/api/auth", "/api/public", "/api/leads", "/api/1c"];
const API_PREFIX = "/api";

const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  "/api/clients":   ["clients:read"],
  "/api/invoices":  ["sales:read"],
  "/api/payments":  ["sales:read"],
  "/api/debts":     ["sales:read"],
  "/api/calls":     ["calls:read"],
  "/api/messages":  ["messages:read"],
  "/api/analytics": ["analytics:read"],
  "/api/marketing": ["marketing:read"],
  "/api/website":   ["website:read"],
  "/api/tasks":     ["tasks:read"],
  "/api/settings":  ["settings:read"],
  "/api/users":     ["users:read"],
};

export default auth(async (req: NextRequest & { auth: { user?: { id: string; role: string; permissions?: string[] } } | null }) => {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
  if (isPublic) return NextResponse.next();

  const session = req.auth;
  if (!session?.user) {
    if (pathname.startsWith(API_PREFIX)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userRole = session.user.role as RoleName;
  const userPerms = ROLE_PERMISSIONS[userRole] || [];

  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const required = ROUTE_PERMISSIONS[matchedRoute];
    const hasAccess = required.some((p) => userPerms.includes(p as Permission));
    if (!hasAccess) {
      if (pathname.startsWith(API_PREFIX)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/overview", req.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", session.user.id);
  response.headers.set("x-user-role", userRole);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
