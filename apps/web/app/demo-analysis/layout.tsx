import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Demo Analysis (Internal)",
  description: "Laboratorio interno de composicao visual para o dashboard de analise.",
  robots: {
    index: false,
    follow: false,
  },
};

type DemoAnalysisLayoutProps = {
  children: ReactNode;
};

export default function DemoAnalysisLayout({
  children,
}: DemoAnalysisLayoutProps) {
  return children;
}
