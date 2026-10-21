import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { missingPermission, homeFor } from "@/lib/auth/access";

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

  const userRole = session.user.role;

  // Permissions come from the role at request time (not the login token),
  // so a role change takes effect without signing out.
  if (missingPermission(userRole, pathname, req.method)) {
    if (pathname.startsWith(API_PREFIX)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(homeFor(userRole), req.url));
  }
  if (pathname === "/") {
    return NextResponse.redirect(new URL(homeFor(userRole), req.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", session.user.id);
  response.headers.set("x-user-role", userRole);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|images/).*)"],
};
