import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ClientRoot } from "@/components/client-root";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChainRight - Procedencia verificable para IA",
  description: "Demostrá que sos el creador original de tus imágenes generadas por IA",
};

/**
 * Root Layout de ChainRight.
 * Server Component por defecto en Next.js 15.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-[#070B1A] text-slate-50 min-h-screen`}>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
