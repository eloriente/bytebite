"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/diet/confirm-delete-button";
import { parseErrorBody } from "@/lib/utils";

export interface PasskeySummary {
  id: string;
  transports: string | null;
  createdAt: string;
}

export function PasskeyManager({ passkeys }: { passkeys: PasskeySummary[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setError(null);
    setAdding(true);
    try {
      const optionsRes = await fetch("/api/users/me/passkeys/register-options", {
        method: "POST",
      });
      if (!optionsRes.ok) {
        throw new Error(await parseErrorBody(optionsRes, "No se pudo iniciar el registro."));
      }
      const { cid, options } = await optionsRes.json();

      const credential = await startRegistration(options);

      const verifyRes = await fetch("/api/users/me/passkeys/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid, credential }),
      });
      if (!verifyRes.ok) {
        throw new Error(await parseErrorBody(verifyRes, "No se pudo verificar la passkey."));
      }

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === "NotAllowedError"
            ? "Cancelado."
            : err.message
          : "No se pudo añadir la passkey.";
      setError(message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/users/me/passkeys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      return { error: await parseErrorBody(res, "No se pudo eliminar la passkey.") };
    }
  }

  return (
    <div className="space-y-2">
      {passkeys.length === 0 && (
        <p className="text-sm text-muted-foreground">No tienes ninguna passkey registrada.</p>
      )}
      {passkeys.map((passkey) => (
        <div
          key={passkey.id}
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">
              Passkey — añadida el {new Date(passkey.createdAt).toLocaleDateString("es-ES")}
            </p>
          </div>
          <ConfirmDeleteButton
            description="Ya no podrás iniciar sesión con esta passkey."
            onConfirm={() => handleDelete(passkey.id)}
          />
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={adding}
        onClick={handleAdd}
      >
        {adding ? "Añadiendo…" : "Añadir passkey de este dispositivo"}
      </Button>
    </div>
  );
}
