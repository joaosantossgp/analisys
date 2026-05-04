import type { Metadata } from "next";

import { UpdateBasePage } from "@/components/update-base/update-base-page";
import { fetchCompanyFilters } from "@/lib/api";

export const metadata: Metadata = {
  title: "Atualizar base",
  description:
    "Painel administrativo para acompanhar e iniciar atualizacoes em massa da base empresarial.",
};

export default async function AtualizarBaseRoute() {
  const filters = await fetchCompanyFilters().catch(() => null);
  return <UpdateBasePage initialSectors={filters?.sectors ?? []} />;
}
