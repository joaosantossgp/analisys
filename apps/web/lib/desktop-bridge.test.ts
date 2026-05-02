/**
 * Tests for desktop-bridge.ts
 *
 * Testa:
 * - isDesktopMode() detecção
 * - bridgeFetch* rota para window.pywebview.api em modo desktop
 * - bridgeFetch* lança BridgeError quando bridge retorna { error: "..." }
 * - bridgeFetch* lança quando pywebview não disponível
 */

import {
  isDesktopMode,
  bridgeFetchCompanies,
  bridgeFetchCompanyFilters,
  bridgeFetchCompanySuggestions,
  bridgeFetchCompanyInfo,
  bridgeFetchCompanyYears,
  bridgeFetchHealth,
  bridgeFetchPopulares,
  bridgeFetchEmDestaque,
  bridgeFetchSectors,
  bridgeFetchSectorDetail,
  bridgeTrackCompanyView,
} from "./desktop-bridge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockApi = Record<string, jest.Mock>;

function installMockBridge(api: MockApi) {
  Object.defineProperty(window, "pywebview", {
    value: { api },
    writable: true,
    configurable: true,
  });
}

function removeBridge() {
  Object.defineProperty(window, "pywebview", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

const MOCK_COMPANY_PAGE = {
  items: [],
  pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 0, has_next: false, has_previous: false },
  applied_filters: { search: "", sector: null },
};

const MOCK_FILTERS = { sectors: [] };

const MOCK_SUGGESTIONS = { items: [] };

const MOCK_HEALTH = {
  status: "ok",
  version: "desktop",
  database_dialect: "sqlite",
  required_tables: [],
  warnings: [],
  errors: [],
};

const MOCK_SECTORS = { items: [] };

// ---------------------------------------------------------------------------
// isDesktopMode
// ---------------------------------------------------------------------------

describe("isDesktopMode", () => {
  afterEach(removeBridge);

  it("returns false when pywebview absent", () => {
    removeBridge();
    expect(isDesktopMode()).toBe(false);
  });

  it("returns true when pywebview present", () => {
    installMockBridge({});
    expect(isDesktopMode()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanies
// ---------------------------------------------------------------------------

describe("bridgeFetchCompanies", () => {
  afterEach(removeBridge);

  it("calls get_companies with normalized params", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_COMPANY_PAGE);
    installMockBridge({ get_companies: mock });

    const result = await bridgeFetchCompanies({ search: "petr", page: 2, pageSize: 10 });

    expect(mock).toHaveBeenCalledWith({
      search: "petr",
      sector_slug: null,
      page: 2,
      page_size: 10,
    });
    expect(result).toEqual(MOCK_COMPANY_PAGE);
  });

  it("throws BridgeError on error payload", async () => {
    const mock = jest.fn().mockResolvedValue({ error: "db offline" });
    installMockBridge({ get_companies: mock });

    await expect(bridgeFetchCompanies({})).rejects.toThrow("db offline");
  });

  it("throws when pywebview absent", async () => {
    removeBridge();
    await expect(bridgeFetchCompanies({})).rejects.toThrow("pywebview.api indisponível");
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanyFilters
// ---------------------------------------------------------------------------

describe("bridgeFetchCompanyFilters", () => {
  afterEach(removeBridge);

  it("calls get_company_filters", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_FILTERS);
    installMockBridge({ get_company_filters: mock });

    const result = await bridgeFetchCompanyFilters();
    expect(mock).toHaveBeenCalledWith({});
    expect(result).toEqual(MOCK_FILTERS);
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanySuggestions
// ---------------------------------------------------------------------------

describe("bridgeFetchCompanySuggestions", () => {
  afterEach(removeBridge);

  it("passes q, limit, ready_only", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_SUGGESTIONS);
    installMockBridge({ get_company_suggestions: mock });

    await bridgeFetchCompanySuggestions("pet", 5, { readyOnly: true });
    expect(mock).toHaveBeenCalledWith({ q: "pet", limit: 5, ready_only: true });
  });

  it("defaults ready_only to false", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_SUGGESTIONS);
    installMockBridge({ get_company_suggestions: mock });

    await bridgeFetchCompanySuggestions("x");
    expect(mock).toHaveBeenCalledWith(expect.objectContaining({ ready_only: false }));
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanyInfo
// ---------------------------------------------------------------------------

describe("bridgeFetchCompanyInfo", () => {
  afterEach(removeBridge);

  const MOCK_INFO = {
    cd_cvm: 9512,
    company_name: "PETROBRAS",
    nome_comercial: null,
    cnpj: null,
    setor_cvm: null,
    setor_analitico: null,
    sector_name: "Petróleo",
    sector_slug: "petroleo",
    company_type: null,
    ticker_b3: "PETR4",
    read_model_updated_at: null,
    has_readable_current_data: true,
    readable_years_count: 5,
    latest_readable_year: 2023,
    read_availability_code: null,
    read_availability_message: null,
  };

  it("returns company on hit", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_INFO);
    installMockBridge({ get_company_info: mock });

    const result = await bridgeFetchCompanyInfo(9512);
    expect(mock).toHaveBeenCalledWith({ cd_cvm: 9512 });
    expect(result).toEqual(MOCK_INFO);
  });

  it("returns null on not_found", async () => {
    const mock = jest.fn().mockResolvedValue({ not_found: true });
    installMockBridge({ get_company_info: mock });

    const result = await bridgeFetchCompanyInfo(9999);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanyYears
// ---------------------------------------------------------------------------

describe("bridgeFetchCompanyYears", () => {
  afterEach(removeBridge);

  it("returns years array", async () => {
    const mock = jest.fn().mockResolvedValue({ years: [2021, 2022, 2023] });
    installMockBridge({ get_company_years: mock });

    const result = await bridgeFetchCompanyYears(9512);
    expect(result).toEqual([2021, 2022, 2023]);
  });

  it("returns empty array on empty payload", async () => {
    const mock = jest.fn().mockResolvedValue({ years: [] });
    installMockBridge({ get_company_years: mock });

    const result = await bridgeFetchCompanyYears(9512);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchHealth
// ---------------------------------------------------------------------------

describe("bridgeFetchHealth", () => {
  afterEach(removeBridge);

  it("calls get_health and returns payload", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_HEALTH);
    installMockBridge({ get_health: mock });

    const result = await bridgeFetchHealth();
    expect(result.status).toBe("ok");
    expect(result.database_dialect).toBe("sqlite");
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchPopulares / EmDestaque
// ---------------------------------------------------------------------------

describe("bridgeFetchPopulares", () => {
  afterEach(removeBridge);

  it("calls get_populares", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_COMPANY_PAGE);
    installMockBridge({ get_populares: mock });

    await bridgeFetchPopulares();
    expect(mock).toHaveBeenCalledWith({});
  });
});

describe("bridgeFetchEmDestaque", () => {
  afterEach(removeBridge);

  it("passes limit param", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_COMPANY_PAGE);
    installMockBridge({ get_em_destaque: mock });

    await bridgeFetchEmDestaque(5);
    expect(mock).toHaveBeenCalledWith({ limit: 5 });
  });
});

// ---------------------------------------------------------------------------
// bridgeFetchSectors / SectorDetail
// ---------------------------------------------------------------------------

describe("bridgeFetchSectors", () => {
  afterEach(removeBridge);

  it("calls get_sectors", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_SECTORS);
    installMockBridge({ get_sectors: mock });

    await bridgeFetchSectors();
    expect(mock).toHaveBeenCalledWith({});
  });
});

describe("bridgeFetchSectorDetail", () => {
  afterEach(removeBridge);

  const MOCK_SECTOR = {
    sector_name: "Petróleo",
    sector_slug: "petroleo",
    company_count: 3,
    available_years: [2022, 2023],
    selected_year: 2023,
    yearly_overview: [],
    companies: [],
  };

  it("passes slug and year", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_SECTOR);
    installMockBridge({ get_sector_detail: mock });

    await bridgeFetchSectorDetail("petroleo", 2023);
    expect(mock).toHaveBeenCalledWith({ sector_slug: "petroleo", year: 2023 });
  });

  it("omits year when not provided", async () => {
    const mock = jest.fn().mockResolvedValue(MOCK_SECTOR);
    installMockBridge({ get_sector_detail: mock });

    await bridgeFetchSectorDetail("petroleo");
    expect(mock).toHaveBeenCalledWith({ sector_slug: "petroleo" });
  });

  it("returns null on not_found", async () => {
    const mock = jest.fn().mockResolvedValue({ not_found: true });
    installMockBridge({ get_sector_detail: mock });

    const result = await bridgeFetchSectorDetail("nonexistent");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// bridgeTrackCompanyView (fire-and-forget)
// ---------------------------------------------------------------------------

describe("bridgeTrackCompanyView", () => {
  afterEach(removeBridge);

  it("does nothing when bridge absent", () => {
    removeBridge();
    expect(() => bridgeTrackCompanyView(9512)).not.toThrow();
  });

  it("calls track_company_view when bridge present", () => {
    const mock = jest.fn().mockResolvedValue({ ok: true });
    installMockBridge({ track_company_view: mock });

    bridgeTrackCompanyView(9512);
    expect(mock).toHaveBeenCalledWith({ cd_cvm: 9512 });
  });
});
