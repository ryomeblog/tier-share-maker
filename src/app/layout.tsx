import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tier-share-maker.ryome-blog.workers.dev"),
  title: "Tier List Maker",
  description: "ブラウザ上でTier表を作成・共有できるアプリ",
  openGraph: {
    title: "Tier List Maker",
    description: "Tier List Makerで作成",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tier List Maker",
    description: "Tier List Makerで作成",
    images: ["/api/og"],
  },
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
