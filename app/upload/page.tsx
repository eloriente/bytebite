import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UploadDropzone } from "@/components/diet/upload-dropzone";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pb-24 pt-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Subir dieta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona el PDF de tu dieta. ByteBite la analizará y organizará por días y comidas.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <UploadDropzone />
    </main>
  );
}
