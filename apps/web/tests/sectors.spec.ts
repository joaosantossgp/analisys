import { expect, test } from "@playwright/test";

test("hub de setores abre e navega para o detalhe", async ({ page }) => {
  await page.goto("/setores");

  await expect(
    page.getByRole("heading", { name: /leitura por setores/i }),
  ).toBeVisible({ timeout: 30_000 });

  const firstSectorLink = page.getByTestId("sector-card-link").first();
  await expect(firstSectorLink).toBeVisible({ timeout: 30_000 });

  await firstSectorLink.click();

  await expect(page).toHaveURL(/\/setores\/[^/?#]+/i, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
});

test("ano invalido cai para o ano mais recente disponivel do setor", async ({ page }) => {
  await page.goto("/setores");

  const firstBaseLabel = page.locator("text=/Base\\s+\\d{4}/").first();
  const baseText = (await firstBaseLabel.textContent()) ?? "";
  const latestYearMatch = baseText.match(/(\d{4})/);
  expect(latestYearMatch).not.toBeNull();

  const href = await page.getByTestId("sector-card-link").first().getAttribute("href");
  expect(href).toBeTruthy();

  await page.goto(`${href}?ano=1900`);

  await expect(
    page.getByText(new RegExp(`Base\\s+${latestYearMatch?.[1]}`, "i")),
  ).toBeVisible({ timeout: 30_000 });
});

test("detalhe da empresa aponta para o detalhe do setor com o ano mais recente", async ({ page }) => {
  await page.goto("/empresas/9512?anos=2023,2024");

  await expect(page.locator("h1").first()).toContainText(/PETROBRAS/i, {
    timeout: 30_000,
  });

  await page.getByRole("link", { name: /ver setor/i }).click();

  await expect(page).toHaveURL(/\/setores\/[^/?#]+\?ano=2024/i, {
    timeout: 30_000,
  });
});

test("slug inexistente cai em not-found", async ({ page }) => {
  await page.goto("/setores/slug-inexistente");

  await expect(
    page.getByRole("heading", {
      name: /esse caminho ainda nao existe nesta fase/i,
    }),
  ).toBeVisible({ timeout: 30_000 });
});

test("renderiza a visao geral do setor com KPIs agregados", async ({ page }) => {
  // 1. Navega para a listagem para pegar o primeiro setor real
  await page.goto("/setores");
  const firstSectorLink = page.getByTestId("sector-card-link").first();
  await expect(firstSectorLink).toBeVisible({ timeout: 30_000 });
  const href = await firstSectorLink.getAttribute("href");
  expect(href).toBeTruthy();

  // 2. Navega para o detalhe do setor (aba padrao e visao-geral)
  await page.goto(href!);

  // 3. Verifica o heading da visao geral
  await expect(
    page.getByRole("heading", { name: /KPIs agregados do recorte selecionado/i }),
  ).toBeVisible({ timeout: 30_000 });

  // 4. Verifica os cards de metricas
  await expect(page.getByText("ROE", { exact: true })).toBeVisible();
  await expect(page.getByText("Margem EBIT", { exact: true })).toBeVisible();
  await expect(page.getByText("Margem Liquida", { exact: true })).toBeVisible();

  // 5. Verifica a tabela de serie anual
  await expect(
    page.getByRole("heading", { name: /Leitura curta por ano/i }),
  ).toBeVisible();

  const table = page.locator("table");
  await expect(table).toBeVisible();

  // A tabela deve ter pelo menos o header e uma linha de dados
  const rows = table.locator("tr");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(1);
});
