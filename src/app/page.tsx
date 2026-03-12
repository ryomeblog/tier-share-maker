import type { Metadata } from "next";
import { TierListEditor } from "@/components/TierListEditor";

type Props = {
  searchParams: Promise<{ data?: string }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { data } = await searchParams;

  if (data) {
    const ogImageUrl = `/api/og?data=${data}`;
    return {
      title: "Tier List Maker",
      description: "Tier List Makerで作成",
      openGraph: {
        title: "Tier List Maker",
        description: "Tier List Makerで作成",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Tier List Maker",
        description: "Tier List Makerで作成",
        images: [ogImageUrl],
      },
    };
  }

  return {
    title: "Tier List Maker",
    description: "ブラウザ上でTier表を作成・共有できるアプリ",
  };
}

export default function Home() {
  return <TierListEditor />;
}
