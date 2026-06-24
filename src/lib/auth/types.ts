import type { DefaultSession } from "next-auth";
import type { Permission, RoleName } from "@/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleName;
      permissions: Permission[];
    } & DefaultSession["user"];
  }
  interface User {
    role: RoleName;
  }
}
