import { NextRequest, NextResponse } from "next/server";

import { readCompaniesDirectoryQuery } from "@/lib/companies-directory-query";
import { loadCompaniesPageData } from "@/lib/companies-page-data";

export async function GET(request: NextRequest) {
  const query = readCompaniesDirectoryQuery(request.nextUrl.searchParams);
  const payload = await loadCompaniesPageData({
    search: query.search,
    sector: query.sector,
    page: query.page,
    pageSize: query.pageSize,
  });

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
