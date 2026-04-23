"use client";

import { useEffect } from "react";

import { trackCompanyView } from "@/lib/api";
import { track } from "@/lib/track";

type CompanyDetailTrackerProps = {
  cdCvm: number;
  companyName: string;
  years: number[];
  tab: string;
  statementType: string;
};

export function CompanyDetailTracker({
  cdCvm,
  companyName,
  years,
  tab,
  statementType,
}: CompanyDetailTrackerProps) {
  useEffect(() => {
    trackCompanyView(cdCvm);
    track("company_detail_viewed", {
      cd_cvm: cdCvm,
      company_name: companyName,
      years: years.join(","),
      tab,
      stmt: statementType,
    });
  }, [cdCvm, companyName, years, statementType, tab]);

  return null;
}
