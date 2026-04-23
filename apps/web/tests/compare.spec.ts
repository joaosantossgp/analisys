import { expect, test } from "@playwright/test";

test("compare deixa claro quando nao ha sugestoes rapidas prontas", async ({ page }) => {
  await page.goto("/comparar");

  await expect(
    page.getByRole("heading", {
      name: /comparacao de empresas/i,
    }),
  ).toBeVisible();

  await expect(page.getByTestId("compare-quick-add")).toHaveCount(0);
  await expect(
    page.getByText(/nenhuma sugestao rapida pronta agora/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /baixar lote excel/i }),
  ).toBeDisabled();
});

test("busca do compare usa o proxy same-origin pronto-only e reidrata a selecao", async ({
  page,
}) => {
  await page.route("**/api/company-search**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("ready_only")).toBe("1");
    expect(url.searchParams.get("q")).toBe("petro");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            cd_cvm: 9512,
            company_name: "PETROLEO BRASILEIRO S.A. - PETROBRAS",
            ticker_b3: "PETR4.SA",
            sector_slug: "petroleo-e-gas",
          },
          {
            cd_cvm: 4170,
            company_name: "VALE S.A.",
            ticker_b3: "VALE3.SA",
            sector_slug: "mineracao",
          },
        ],
      }),
    });
  });

  await page.goto("/comparar");

  const searchbox = page.getByRole("searchbox", {
    name: /buscar empresa para comparar/i,
  });
  await searchbox.fill("petro");

  const suggestionButtons = page.getByTestId("compare-suggestion-add");
  await expect(suggestionButtons).toHaveCount(2);

  await suggestionButtons.first().click();
  await expect(page).toHaveURL(/\/comparar\?ids=9512/i, {
    timeout: 30_000,
  });
  await expect(page.getByTestId("compare-selected-chip")).toHaveCount(1);

  await searchbox.fill("petro");
  await expect(suggestionButtons).toHaveCount(1);
  await suggestionButtons.first().click();

  await expect(page).toHaveURL(/\/comparar\?ids=9512(%2C|,)4170/i, {
    timeout: 30_000,
  });
  await expect(page.getByTestId("compare-selected-chip")).toHaveCount(2);
  await expect(page.getByTestId("compare-state-card")).toBeVisible();
});

test("deep-link com ids mostra estado controlado quando nao ha periodo em comum", async ({
  page,
}) => {
  await page.goto("/comparar?ids=9512,4170");

  await expect(page.getByTestId("compare-selected-chip")).toHaveCount(2);
  await expect(page.getByTestId("compare-state-card")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /sem periodo em comum/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /baixar lote excel/i }),
  ).toBeVisible();
});

test("ids invalidos mostram fallback controlado", async ({ page }) => {
  await page.goto("/comparar?ids=999999,888888");

  await expect(
    page.getByRole("alert").filter({ hasText: /comparacao indisponivel no estado atual/i }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /abrir diretorio/i })).toBeVisible();
});

test("busca do compare mostra feedback quando nenhuma empresa pronta e encontrada", async ({
  page,
}) => {
  await page.goto("/comparar");

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/company-search"),
  );

  await page
    .getByRole("searchbox", { name: /buscar empresa para comparar/i })
    .fill("petro");

  const response = await responsePromise;
  expect(response.url()).toContain("/api/company-search");
  expect(response.url()).toContain("ready_only=1");
  expect(response.url()).not.toContain(":8000/companies/suggestions");

  await expect(
    page.getByText(/nenhuma companhia pronta e comparavel apareceu com esse termo/i),
  ).toBeVisible();
});
