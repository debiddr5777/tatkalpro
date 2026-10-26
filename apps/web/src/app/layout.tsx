import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TatkalPro — beat the Tatkal window",
  description: "Self-hosted, open-source IRCTC Tatkal booking super-app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
