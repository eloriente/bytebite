"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, LayoutDashboard, NotebookText, Settings, LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/diets", label: "Gestionar dietas", icon: NotebookText },
  { href: "/chat", label: "Asistente nutricional", icon: MessageCircle },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function SideMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>ByteBite</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between rounded-md px-1 py-2">
          <span className="text-sm">Tema</span>
          <ThemeToggle />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <SheetClose asChild key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <Button
          variant="ghost"
          className="justify-start gap-3 px-2 text-destructive hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </SheetContent>
    </Sheet>
  );
}
