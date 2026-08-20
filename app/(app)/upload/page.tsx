import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UploadFlow } from "@/components/diet/upload-flow";

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 pb-24 pt-10">
      <header>
        <h1 className="text-xl font-semibold">Subir dieta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elige cómo quieres crear tu dieta.</p>
      </header>

      <UploadFlow />
    </main>
  );
}
