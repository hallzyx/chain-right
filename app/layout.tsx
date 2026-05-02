import type { Metadata } from "next";
import "./globals.css";
import { Inter, Newsreader } from "next/font/google";
import { ClientRoot } from "@/components/client-root";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ChainRight - Impenetrable Provenance",
  description:
    "The Future of AI Art requires more than just watermarks. ChainRight leverages cryptographic DNA to anchor creative authorship into the eternal ledger.",
};

/**
 * Root Layout de ChainRight — Black & Amber Edition.
 * Server Component por defecto en Next.js 15.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${newsreader.variable} bg-[#0A0A0A] text-[#f0e0d1] min-h-screen font-sans selection:bg-primary-container selection:text-on-primary-fixed`}
      >
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
