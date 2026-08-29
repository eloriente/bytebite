import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { TabBar } from "@/components/nav/tab-bar";
import { SignOutButton } from "@/components/nav/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PushRegistration } from "@/components/push-registration";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <PushRegistration />
      <header className="sticky top-0 z-40 flex min-h-[var(--header-h)] items-center justify-between gap-2 border-b border-border bg-background/90 px-3 pt-[var(--sat)] backdrop-blur-md">
        <span className="t-head">ByteBite</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      {children}
      <TabBar />
    </div>
  );
}
