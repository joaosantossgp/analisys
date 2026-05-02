import type { Metadata } from "next";

import { UpdateBasePage } from "@/components/update-base/update-base-page";

export const metadata: Metadata = {
  title: "Atualizar base",
  description:
    "Painel administrativo para acompanhar e iniciar atualizacoes em massa da base empresarial.",
};

export default function AtualizarBaseRoute() {
  return <UpdateBasePage />;
}
