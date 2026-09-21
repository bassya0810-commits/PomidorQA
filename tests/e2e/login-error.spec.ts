import { test, expect } from "@playwright/test";
import { contextTracker } from "../helpers/user";

test.afterEach(async () => {
  await contextTracker.cleanup();
});

test("вход с неверными данными — одинаковая ошибка в обоих случаях, без уточнения причины", async ({
  page,
}) => {
  const runId = Date.now();
  const email = `login-check-${runId}@example.com`;
  const password = "correct-password-123";
  contextTracker.track(page.context());

  await test.step("Заводим реальный аккаунт для проверки", async () => {
    await page.goto("/pomidorqa/auth/register");
    await page.getByLabel("Имя").fill("Login Error Check");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  });

  await test.step("Заводим реальный аккаунт для проверки — проверка редиректа", async () => {
    await expect(page).toHaveURL(/\/pomidorqa\/?$/);
  });

  let wrongPasswordError = "";
  
  await test.step("Пробуем войти с верным email, но неверным паролем", async () => {
    await page.goto("/pomidorqa/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill("wrong-password");
    await page.getByRole("button", { name: "Войти" }).click();
  });

  await test.step("Пробуем войти с верным email, но неверным паролем — проверка ошибки", async () => {
    const error = page.getByText(/Неверный/);
    await expect(error).toBeVisible();
    wrongPasswordError = (await error.textContent())?.trim() ?? "";
  });

  let unknownEmailError = "";
  
  await test.step("Пробуем войти с несуществующим email", async () => {
    await page.goto("/pomidorqa/auth/login");
    await page.getByLabel("Email").fill(`no-such-user-${runId}@example.com`);
    await page.getByLabel("Пароль").fill("any-password-123");
    await page.getByRole("button", { name: "Войти" }).click();
  });

  await test.step("Пробуем войти с несуществующим email — проверка ошибки", async () => {
    const error = page.getByText(/Неверный/);
    await expect(error).toBeVisible();
    unknownEmailError = (await error.textContent())?.trim() ?? "";
  });

  await test.step("Проверяем: текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно", async () => {
    expect(wrongPasswordError).toBe(unknownEmailError);
    expect(wrongPasswordError).toContain("Неверный");
  });
});
