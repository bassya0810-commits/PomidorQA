import { expect, type Page, type BrowserContext } from "@playwright/test";

export const timezones = {
  EKATERINBURG: "Asia/Yekaterinburg",
  MOSCOW: "Europe/Moscow",
  LONDON: "Europe/London",
} as const;

// Регистрация
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeUser(role: string, runId: string | number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${String(runId)}@example.com`,
    password: "testpass123",
  };
}

function parseSessionCookie(headerValue: string | string[] | undefined): { name: string; value: string; domain: string; path: string; httpOnly: boolean; secure: boolean; sameSite: "Lax" | "Strict" | "None" } | null {
  const raw = Array.isArray(headerValue) ? headerValue.join(",") : headerValue;
  if (!raw) return null;

  const pairs = raw.split(";").map((part) => part.trim());
  const cookiePair = pairs.find((part) => part.includes("=") && !part.toLowerCase().includes("path") && !part.toLowerCase().includes("domain") && !part.toLowerCase().includes("expires") && !part.toLowerCase().includes("samesite") && !part.toLowerCase().includes("secure") && !part.toLowerCase().includes("httponly"));

  if (!cookiePair) return null;

  const [name, ...valueParts] = cookiePair.split("=");
  const value = valueParts.join("=");

  if (!name || !value) return null;

  const hasDomain = pairs.some((part) => part.toLowerCase().startsWith("domain="));
  const hasPath = pairs.some((part) => part.toLowerCase().startsWith("path="));
  const domain = hasDomain ? pairs.find((part) => part.toLowerCase().startsWith("domain="))?.slice("domain=".length) ?? "aiqa.su" : "aiqa.su";
  const path = hasPath ? pairs.find((part) => part.toLowerCase().startsWith("path="))?.slice("path=".length) ?? "/" : "/";
  const sameSiteFlag = pairs.find((part) => part.toLowerCase().startsWith("samesite="));
  const sameSite = sameSiteFlag ? (sameSiteFlag.slice("samesite=".length).toLowerCase() === "strict" ? "Strict" : sameSiteFlag.slice("samesite=".length).toLowerCase() === "none" ? "None" : "Lax") : "Lax";

  return {
    name,
    value,
    domain,
    path,
    httpOnly: pairs.some((part) => part.toLowerCase() === "httponly"),
    secure: pairs.some((part) => part.toLowerCase() === "secure"),
    sameSite,
  };
}

export async function registerUserViaApi(page: Page, user: TestUser) {
  const apiContext = await page.context().request;
  const response = await apiContext.post("/pomidorqa/auth/register", {
    form: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
    headers: {
      Origin: "https://aiqa.su",
      Referer: "https://aiqa.su/pomidorqa/auth/register",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0,
  });

  const cookieHeader = response.headers()["set-cookie"] ?? response.headers()["Set-Cookie"];
  const sessionCookie = parseSessionCookie(cookieHeader);

  if (sessionCookie) {
    await page.context().addCookies([
      {
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: sessionCookie.domain,
        path: sessionCookie.path,
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite,
      },
    ]);
    await page.goto("/pomidorqa");
    await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
    return;
  }

  await registerUser(page, user);
}

export type ApiUser = {
  user: TestUser;
  context: BrowserContext;
  page: Page;
};
export const contextTracker = {
  activeContexts: [] as BrowserContext[],

  track(context: BrowserContext) {
    if (!this.activeContexts.includes(context)) {
      this.activeContexts.push(context);
    }
  },

  async cleanup() {
    for (const context of this.activeContexts) {
      try {
        await deleteUserViaApi(context);
      } catch (error) {
        console.error("Не удалось удалить пользователя из БД:", error);
      } finally {
        await context.close().catch(() => {});
      }
    }
    this.activeContexts = [];
  }
};

export async function deleteUserViaApi(context: BrowserContext): Promise<void> {
  const response = await context.request.delete("/api/pomidorqa/test/accounts");
 
  if (response.status() !== 200) {
    throw new Error(
      `Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`,
    );
  }
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto("/pomidorqa/auth/register");
  await registerNameInput(page).fill(user.name);
  await registerEmailInput(page).fill(user.email);
  await registerPasswordInput(page).fill(user.password);
  await registerSubmitButton(page).click();
  await expect(page).toHaveURL(/\/pomidorqa\/?$/, { timeout: 15_000 });
}

