import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Fabric Automation",
    default: "Fabric Automation - Business OS",
  },
  description: "Tibbiy paxta va bint fabrikasi boshqaruv tizimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased bg-slate-950`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
