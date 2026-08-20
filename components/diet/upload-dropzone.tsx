"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Status = "idle" | "dragging" | "error";

export function UploadDropzone({
  parsing,
  onFileSelected,
}: {
  parsing: boolean;
  onFileSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("El archivo debe ser un PDF.");
      return;
    }
    setStatus("idle");
    setErrorMessage(null);
    onFileSelected(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!parsing) setStatus("dragging");
        }}
        onDragLeave={() => setStatus((s) => (s === "dragging" ? "idle" : s))}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => !parsing && inputRef.current?.click()}
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

        {parsing && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Analizando el PDF…</p>
            <p className="text-xs text-muted-foreground">Esto puede tardar unos segundos.</p>
          </>
        )}

        {!parsing && status === "error" && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
              Inténtalo de nuevo
            </Button>
          </>
        )}

        {!parsing && (status === "idle" || status === "dragging") && (
          <>
            <FileUp className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Arrastra tu PDF aquí</p>
            <p className="text-xs text-muted-foreground">o toca para seleccionar un archivo</p>
          </>
        )}
      </div>
    </div>
  );
}
