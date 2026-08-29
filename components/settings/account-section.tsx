"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupedList, GroupedListRow } from "@/components/ui/grouped-list";
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
import { EntityFormDialog } from "@/components/diet/entity-form-dialog";
import { parseErrorBody } from "@/lib/utils";

function SignOutEverywhereRow() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/users/me/sign-out-everywhere", { method: "POST" });
    if (!res.ok) {
      setLoading(false);
      setError(await parseErrorBody(res, "No se pudo cerrar la sesión en todos los dispositivos."));
      return;
    }

    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 text-left text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <span className="flex-1 text-[0.95rem]">Cerrar sesión en todos los dispositivos</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cerrar sesión en todos los dispositivos?</DialogTitle>
          <DialogDescription>
            Cierra la sesión en todos los dispositivos donde hayas iniciado sesión, incluido este.
            Tus passkeys siguen funcionando: podrás volver a entrar con ellas cuando quieras.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={loading} onClick={handleConfirm}>
            {loading ? "Cerrando…" : "Cerrar sesión en todos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccountSection({ name, email }: { name: string; email: string }) {
  const router = useRouter();

  async function handleRename(values: Record<string, string>) {
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name }),
    });
    if (!res.ok) {
      return { error: await parseErrorBody(res, "No se pudo guardar el nombre.") };
    }
    router.refresh();
  }

  return (
    <GroupedList>
      <EntityFormDialog
        title="Cambiar nombre"
        fields={[{ name: "name", label: "Nombre", defaultValue: name, required: true }]}
        onSubmit={handleRename}
        trigger={
          <GroupedListRow className="cursor-pointer justify-between text-left">
            <div className="min-w-0">
              <p className="truncate text-[0.95rem]">{name}</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </GroupedListRow>
        }
      />
      <GroupedListRow>
        <SignOutEverywhereRow />
      </GroupedListRow>
    </GroupedList>
  );
}
