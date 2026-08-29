"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageCircle, NotebookText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Hoy", icon: LayoutDashboard },
  { href: "/diets", label: "Dietas", icon: NotebookText },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[var(--sab)] backdrop-blur-md supports-[backdrop-filter]:bg-card/90"
      style={{ height: "calc(var(--tabbar-h) + var(--sab))" }}
    >
      <div className="mx-auto flex h-[var(--tabbar-h)] max-w-lg items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[0.6875rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
