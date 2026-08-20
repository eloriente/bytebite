import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SideMenu } from "@/components/nav/side-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SideMenu />
        <span className="text-sm font-semibold">ByteBite</span>
      </header>
      {children}
    </div>
  );
}
