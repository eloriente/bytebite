import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    // Opcional: la sesión se devuelve sin `user` cuando `sessionVersion` no coincide con la
    // BD (revocada por "cerrar sesión en todos los dispositivos" — ver auth.ts).
    user?: {
      id: string;
      sessionVersion?: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    sessionVersion?: number;
  }
}
