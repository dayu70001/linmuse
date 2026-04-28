import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lin Muse | Apparel, Shoes & Watches Wholesale",
  description:
    "Lin Muse is an international retail and wholesale partner for apparel, shoes, and watches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
