"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Status = "idle" | "dragging" | "uploading" | "success" | "error";

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("El archivo debe ser un PDF.");
      return;
    }

    setFileName(file.name);
    setStatus("uploading");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/diets/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al procesar el PDF");
      }

      setStatus("success");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (status !== "uploading") setStatus("dragging");
      }}
      onDragLeave={() => setStatus((s) => (s === "dragging" ? "idle" : s))}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      onClick={() => status !== "uploading" && inputRef.current?.click()}
      className={cn(
        "flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        status === "dragging" && "border-primary bg-accent",
        status === "error" && "border-destructive",
        status === "idle" && "border-border",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {status === "uploading" && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Analizando {fileName}…</p>
          <p className="text-xs text-muted-foreground">Esto puede tardar unos segundos.</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <p className="text-sm font-medium">¡Dieta cargada correctamente!</p>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
            Inténtalo de nuevo
          </Button>
        </>
      )}

      {(status === "idle" || status === "dragging") && (
        <>
          <FileUp className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Arrastra tu PDF aquí</p>
          <p className="text-xs text-muted-foreground">o toca para seleccionar un archivo</p>
        </>
      )}
    </div>
  );
}
