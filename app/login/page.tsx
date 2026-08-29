"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { passkeyRegisterOptionsSchema } from "@/lib/validation/auth";
import { parseErrorBody } from "@/lib/utils";

async function finishSignIn(token: string) {
  const res = await signIn("credentials", { token, redirect: false });
  if (res?.error) throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.name === "NotAllowedError") return "Cancelado.";
    return error.message || fallback;
  }
  return fallback;
}

function LoginPanel() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!browserSupportsWebAuthn()) {
      setError("Este navegador no soporta passkeys.");
      return;
    }

    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/login-options", { method: "POST" });
      if (!optionsRes.ok) {
        throw new Error(await parseErrorBody(optionsRes, "No se pudo iniciar el login."));
      }
      const { cid, options } = await optionsRes.json();

      const credential = await startAuthentication(options);

      const verifyRes = await fetch("/api/auth/webauthn/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid, credential }),
      });
      if (!verifyRes.ok) {
        throw new Error(await parseErrorBody(verifyRes, "No se pudo verificar la passkey."));
      }
      const { token } = await verifyRes.json();

      await finishSignIn(token);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, "No se pudo iniciar sesión."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Inicia sesión con la passkey de tu dispositivo (huella, Face ID, PIN...).
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" size="lg" onClick={handleLogin} disabled={loading}>
        {loading ? "Verificando…" : "Entrar con passkey"}
      </Button>
    </div>
  );
}

function RegisterPanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!browserSupportsWebAuthn()) {
      setError("Este navegador no soporta passkeys.");
      return;
    }

    const parsed = passkeyRegisterOptionsSchema.safeParse({ name, email });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!optionsRes.ok) {
        throw new Error(await parseErrorBody(optionsRes, "No se pudo crear la cuenta."));
      }
      const { cid, options } = await optionsRes.json();

      const credential = await startRegistration(options);

      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid, credential }),
      });
      if (!verifyRes.ok) {
        throw new Error(await parseErrorBody(verifyRes, "No se pudo verificar la passkey."));
      }
      const { token } = await verifyRes.json();

      await finishSignIn(token);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, "No se pudo crear la cuenta."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Crea tu cuenta y registra una passkey de este dispositivo. Sin contraseñas: si pierdes el
        dispositivo, pierdes el acceso a la cuenta (sin recuperación).
      </p>

      <div className="space-y-1.5">
        <label htmlFor="register-name" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="register-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border-0 bg-secondary px-3.5 py-3 text-[0.95rem] tracking-[-0.012em] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        />
        {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="register-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border-0 bg-secondary px-3.5 py-3 text-[0.95rem] tracking-[-0.012em] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Creando passkey…" : "Crear cuenta con passkey"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))]">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="t-large">ByteBite</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu dieta, siempre a mano.</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Crear cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginPanel />
          </TabsContent>
          <TabsContent value="register">
            <RegisterPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
