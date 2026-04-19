import { Suspense } from "react";
import type { Metadata } from "next";

import {
  CompaniesDirectoryClient,
  CompaniesDirectoryLoadingState,
} from "@/components/companies/companies-directory-client";

export const metadata: Metadata = {
  title: "Empresas",
  description:
    "Diretorio publico e paginado de empresas com dados financeiros ja processados na base CVM Analytics.",
};

export const revalidate = 3600;

export default function EmpresasPage() {
  return (
    <Suspense fallback={<CompaniesDirectoryLoadingState />}>
      <CompaniesDirectoryClient />
    </Suspense>
  );
}
