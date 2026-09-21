import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, contextTracker } from "../helpers/user";
import { BookingPage } from "../pages/BookingPage";
import { ProfilePage } from "../pages/ProfilePage";

test.describe("Бронирование: нельзя забронировать собственный слот", () => {
  test.afterEach(async () => {
    await contextTracker.cleanup();
  });

  test("владелец не видит себя доступным участником для бронирования", async ({ page }) => {
    const runId = crypto.randomUUID().slice(0, 10);
    const user = makeUser("own-slot", runId);
    const skillTag = `OwnSlot-${runId}`;
    const bookingPage = new BookingPage(page);
    const profilePage = new ProfilePage(page);
    contextTracker.track(page.context());

    await test.step("Участник: регистрируется через API", async () => {
      await registerUserViaApi(page, user);
    });

    await test.step("Участник: добавляет навык в профиль", async () => {
      await profilePage.goto();
      await profilePage.addSkill(skillTag, "can_help");
    });

    await test.step("Проверка: навык появился в профиле", async () => {
      await expect(profilePage.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Участник: создаёт свободный слот", async () => {
      await bookingPage.gotoSlots();
      await bookingPage.addSlot();
    });

    await test.step("Проверка: слот появился в списке слотов", async () => {
      await expect(bookingPage.slotsCard.first()).toBeVisible();
    });

    await test.step("Участник: открывает каталог по своему навыку", async () => {
      await page.goto("/pomidorqa");
      await bookingPage.searchBySkill(skillTag);
    });

    await test.step("Проверка: собственная карточка отсутствует в каталоге", async () => {
      await expect(bookingPage.catalogCard.filter({ hasText: user.name })).toHaveCount(0);
    });
  });
});