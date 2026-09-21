import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, contextTracker } from "../helpers/user";
import { BookingPage } from "../pages/BookingPage";

test.describe("Слоты: нельзя создать слот в прошлом", () => {
  test.afterEach(async () => {
    await contextTracker.cleanup();
  });

  test("слот с прошедшей датой не создаётся", async ({ page }) => {
    const user = makeUser("slot-past", crypto.randomUUID().slice(0, 10));
    contextTracker.track(page.context());
    const bookingPage = new BookingPage(page);

    await test.step("Участник: регистрируется через API", async () => {
      await registerUserViaApi(page, user);
    });

    await test.step("Участник: открывает форму добавления слота", async () => {
      await bookingPage.gotoSlots();
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await test.step("Участник: пытается добавить слот на вчера", async () => {
      await bookingPage.addSlotAt(yesterday, "12:00");
    });

    await test.step("Проверка: слот не появился в списке", async () => {
      await expect(bookingPage.slotsCard).toHaveCount(0);
    });
  });
});