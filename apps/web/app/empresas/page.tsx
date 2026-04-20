import { Suspense } from "react";
import type { Metadata } from "next";

import {
  CompaniesDirectoryPageContent,
  CompaniesDirectoryLoadingState,
} from "@/components/companies/companies-directory-client";
import { readCompaniesDirectoryQueryFromRecord } from "@/lib/companies-directory-query";
import { loadCompaniesPageData } from "@/lib/companies-page-data";

export const metadata: Metadata = {
  title: "Empresas",
  description:
    "Diretorio publico e paginado de empresas com dados financeiros ja processados na base CVM Analytics.",
};

export const revalidate = 300;

type EmpresasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function EmpresasPage({ searchParams }: EmpresasPageProps) {
  return (
    <Suspense fallback={<CompaniesDirectoryLoadingState />}>
      <EmpresasPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EmpresasPageContent({ searchParams }: EmpresasPageProps) {
  const directoryQuery = readCompaniesDirectoryQueryFromRecord(await searchParams);
  const data = await loadCompaniesPageData({
    search: directoryQuery.search,
    sector: directoryQuery.sector,
    page: directoryQuery.page,
    pageSize: directoryQuery.pageSize,
  });

  return (
    <CompaniesDirectoryPageContent
      data={data}
      page={directoryQuery.page}
      pageSize={directoryQuery.pageSize}
      search={directoryQuery.search}
      sector={directoryQuery.sector}
      viewMode={directoryQuery.viewMode}
    />
  );
}
