import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION = "Jogo de enigmas multiplayer em tempo real.";

export const metadata: Metadata = {
  // Required for OG/canonical URLs to resolve absolutely in production.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Black Stories",
    template: "%s · Black Stories",
  },
  description: DESCRIPTION,
  applicationName: "Black Stories",
  openGraph: {
    type: "website",
    siteName: "Black Stories",
    title: "Black Stories",
    description: DESCRIPTION,
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image", title: "Black Stories", description: DESCRIPTION },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
