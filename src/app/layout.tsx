import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tier List Maker",
  description: "ブラウザ上でTier表を作成・共有できるアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
