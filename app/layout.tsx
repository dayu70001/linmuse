import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://linmuse.com"),
  title: "LM Dkbrand | Factory Direct Retail & Wholesale",
  description:
    "LM Dkbrand offers apparel, shoes, watches, and bags for retail and wholesale buyers, with factory-direct supply, orders from 1 piece, and fast delivery in 7-12 business days.",
  openGraph: {
    title: "LM Dkbrand | Factory Direct Retail & Wholesale",
    description:
      "LM Dkbrand offers apparel, shoes, watches, and bags for retail and wholesale buyers, with factory-direct supply, orders from 1 piece, and fast delivery in 7-12 business days.",
    url: "https://linmuse.com",
    siteName: "LM Dkbrand",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LM Dkbrand | Factory Direct Retail & Wholesale",
    description:
      "LM Dkbrand offers apparel, shoes, watches, and bags for retail and wholesale buyers, with factory-direct supply, orders from 1 piece, and fast delivery in 7-12 business days.",
  },
  verification: {
    google: "w_-bXnffBPh3XyPIfTHDXlpCamcQkG3Y4a_Ex1rP3jo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <GoogleAnalytics />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
