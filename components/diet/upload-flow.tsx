"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Sparkles, PenLine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadDropzone } from "@/components/diet/upload-dropzone";
import { DietForm } from "@/components/diet/diet-form";
import type { ParsedDiet } from "@/lib/gemini";

type Step = "choice" | "automatic" | "manual";

export function UploadFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choice");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function goToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  async function handleFileSelected(file: File) {
    setParsing(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const parseRes = await fetch("/api/diets/parse", { method: "POST", body: formData });
      const parseData = await parseRes.json().catch(() => ({}));

      if (!parseRes.ok) {
        setParseError(parseData.error ?? "No se pudo procesar el PDF.");
        setParsing(false);
        return;
      }

      const parsedDiet = parseData.diet as ParsedDiet;
      const createRes = await fetch("/api/diets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedDiet),
      });

      if (!createRes.ok) {
        const createData = await createRes.json().catch(() => ({}));
        setParseError(createData.error ?? "No se pudo guardar la dieta extraída.");
        setParsing(false);
        return;
      }

      goToDashboard();
    } catch {
      setParseError("No se pudo procesar el PDF. Puedes rellenar la dieta manualmente.");
      setParsing(false);
    }
  }

  if (step === "choice") {
    return (
      <div className="grid gap-3">
        <Card
          className="flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-accent"
          onClick={() => setStep("automatic")}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Automático (IA)</p>
              <p className="text-xs text-muted-foreground">
                Sube el PDF y ByteBite lo organiza por ti.
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-accent"
          onClick={() => setStep("manual")}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Manual</p>
              <p className="text-xs text-muted-foreground">
                Rellena tú mismo los días, comidas e ingredientes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
        onClick={() => {
          setParseError(null);
          setStep("choice");
        }}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Elegir otro método
      </Button>

      {step === "automatic" && (
        <>
          {parseError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p>{parseError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParseError(null);
                    setStep("manual");
                  }}
                >
                  Rellenar manualmente
                </Button>
              </div>
            </div>
          )}
          <UploadDropzone parsing={parsing} onFileSelected={handleFileSelected} />
        </>
      )}

      {step === "manual" && <DietForm onSubmitted={goToDashboard} />}
    </div>
  );
}
