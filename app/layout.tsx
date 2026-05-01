import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileWhatsAppBar } from "@/components/MobileWhatsAppBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "LM Dkbrand | Factory Direct Retail & Wholesale",
  description:
    "LM Dkbrand offers apparel, shoes, watches, and bags for retail and wholesale buyers, with factory-direct supply, orders from 1 piece, and fast delivery in 7-12 business days.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <Footer />
        <MobileWhatsAppBar />
      </body>
    </html>
  );
}
