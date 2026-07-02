import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ROLE_PERMISSIONS } from "@/constants";
import type { Permission, RoleName } from "@/constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Aniq ko'rsatish: NEXTAUTH_SECRET → AUTH_SECRET fallback
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  // JWT strategiya bilan PrismaAdapter kerak emas — soddalik + xatolarni kamaytiradi
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: { role: true },
        });

        if (!user || !user.password || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role.name as RoleName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: RoleName }).role;
        token.permissions = ROLE_PERMISSIONS[
          (user as { role: RoleName }).role
        ] as Permission[];
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as RoleName;
        session.user.permissions = token.permissions as Permission[];
      }
      return session;
    },
  },
});
