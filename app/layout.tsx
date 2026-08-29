import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AccentProvider } from "@/components/accent-provider";

export const metadata: Metadata = {
  title: "ByteBite",
  description: "Gestión y visualización de tu dieta, siempre a mano.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ByteBite",
  },
  icons: {
    apple: "/icons/icon-apple.png",
    icon: "/icons/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#34c759",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica data-accent antes de que React hidrate, igual que next-themes hace con el tema —
// si no, se ve un parpadeo del verde por defecto al cargar con otro acento guardado.
const NO_FLASH_ACCENT_SCRIPT = `
try {
  var a = localStorage.getItem("bytebite:accent");
  if (a) document.documentElement.setAttribute("data-accent", a);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_ACCENT_SCRIPT }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AccentProvider>{children}</AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
