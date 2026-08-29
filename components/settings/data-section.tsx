"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Download, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { parseErrorBody } from "@/lib/utils";

const DELETE_CONFIRMATION = "ELIMINAR";

function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/users/me", { method: "DELETE" });
    if (!res.ok) {
      setLoading(false);
      setError(await parseErrorBody(res, "No se pudo eliminar la cuenta."));
      return;
    }

    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" className="w-full justify-start gap-2">
          <TriangleAlert className="h-4 w-4" />
          Eliminar cuenta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
          <DialogDescription>
            Se borran tus dietas, tu conversación con el asistente y tus passkeys. No se puede
            deshacer. Escribe <strong>{DELETE_CONFIRMATION}</strong> para confirmar.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={DELETE_CONFIRMATION}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={loading || confirmText !== DELETE_CONFIRMATION}
            onClick={handleConfirm}
          >
            {loading ? "Eliminando…" : "Eliminar cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DataSection() {
  return (
    <div className="space-y-2">
      <Button asChild type="button" variant="outline" className="w-full justify-start gap-2">
        <a href="/api/users/me/export">
          <Download className="h-4 w-4" />
          Exportar mis datos
        </a>
      </Button>
      <DeleteAccountButton />
    </div>
  );
}
