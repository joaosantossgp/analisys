import { expect, test } from "@playwright/test";

test("fluxo inicial de descoberta por empresa", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /analise financeira/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/companhias abertas/i).first()).toBeVisible();
  await expect(page.getByText(/ao vivo|verificando|sem sinal/i).first()).toBeVisible();

  const searchBox = page.getByLabel(/buscar empresa/i);
  await searchBox.fill("petrobras");
  await searchBox.press("Enter");

  await expect(page).toHaveURL(/\/empresas\?busca=petrobras/i, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: /todas as companhias abertas/i }),
  ).toBeVisible({ timeout: 30_000 });

  const petrobrasLink = page.locator('a[href^="/empresas/"]').filter({ hasText: /PETROBRAS/i }).first();
  await expect(petrobrasLink).toBeVisible({ timeout: 30_000 });
  await Promise.all([
    page.waitForURL(/\/empresas\/\d+/, { timeout: 30_000 }),
    petrobrasLink.click(),
  ]);
  await expect(page.locator("h1").first()).toContainText(/PETROBRAS/i);
});

test("detalhe com historico renderiza o dashboard de analise na visao geral", async ({
  page,
}) => {
  await page.goto("/empresas/4170");

  await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
  const analysisPanel = page.getByTestId("company-analysis-panel");
  await expect(analysisPanel).toBeVisible({ timeout: 30_000 });
  await expect(
    analysisPanel.getByRole("heading", { name: /visao anual/i }),
  ).toBeVisible();
  await expect(analysisPanel.getByText(/tabela anual/i)).toBeVisible();
});

test("home suggestions usam a rota same-origin", async ({ page }) => {
  await page.goto("/");

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/company-search"),
  );

  await page.getByLabel(/buscar empresa/i).fill("petro");

  const response = await responsePromise;
  expect(response.url()).toContain("/api/company-search");
  expect(response.url()).not.toContain(":8000/companies/suggestions");
});

test("detalhe sem historico vira experiencia guiada de pre-refresh", async ({ page }) => {
  await page.goto("/empresas/25640");

  await expect(page.locator("h1").first()).toContainText(/AUREN/i, {
    timeout: 30_000,
  });

  await expect(
    page.getByText(/esta empresa ainda depende da primeira materializacao/i),
  ).toBeVisible();
  await expect(
    page.getByText(/o que destrava esta pagina/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /atualizar leitura da cvm/i }),
  ).toBeVisible();
});

test("header mobile preserva navegacao no compare", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/comparar");

  const menuButton = page.getByRole("button", { name: /abrir menu/i });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const mobileNav = page.locator("#mobile-site-nav");
  await expect(mobileNav.getByRole("link", { name: /^empresas$/i })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: /^comparar$/i })).toBeVisible();
});
