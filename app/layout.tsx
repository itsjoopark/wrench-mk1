import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Wrench — Powered by Mk1",
  description:
    "Grounded bike-part detection and schema-guaranteed repair plans, powered by Perceptron's Mk1 VLM.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Mobile-friendly: allow zoom but start at 1x.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}
