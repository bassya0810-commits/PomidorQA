import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, contextTracker } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";
import { BookingPage } from "../pages/BookingPage";

test.describe("Отмена бронирования: действие хоста", () => {
  test.afterEach(async () => {
    await contextTracker.cleanup();
  });

  test("хост отменяет встречу, и она переходит в отменённые у обоих участников", async ({ browser }) => {
    test.setTimeout(60_000);

    const runId = crypto.randomUUID().slice(0, 10);
    const skillTag = `HostCancel-${runId}`;
    const host = makeUser("host-cancel", runId);
    const guest = makeUser("guest-cancel", runId);
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    contextTracker.track(hostContext);
    contextTracker.track(guestContext);

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    await test.step("Хост: регистрируется через API", async () => {
      await registerUserViaApi(hostPage, host);
    });

    await test.step("Хост: добавляет навык и свободный слот", async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
      await hostBooking.gotoSlots();
      await hostBooking.addSlot();
    });

    await test.step("Проверка: слот появился в профиле хоста", async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется через API", async () => {
      await registerUserViaApi(guestPage, guest);
    });

    await test.step("Гость: ищет хоста по навыку", async () => {
      await guestBooking.searchBySkill(skillTag);
      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBooking.openCard(host.name);
    });

    await test.step("Проверка: на странице хоста отображается имя", async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step("Гость: ждёт появления доступного дня слота", async () => {
      await expect(async () => {
        const dayChip = guestBooking.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await guestPage.reload();
        }
        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Гость: выбирает слот и подтверждает бронирование", async () => {
      await guestBooking.selectSlot();
      await guestBooking.bookingConfirm();
    });

    await test.step("Хост: открывает «Мои встречи»", async () => {
      await hostBooking.gotoBookings();
    });

    await test.step("Проверка: у хоста есть гостевое бронирование", async () => {
      await expect(hostBooking.bookingsCardName).toHaveText(guest.name);
    });

    await test.step("Хост: отменяет встречу", async () => {
      await hostBooking.cancelBooking();
    });

    await test.step("Проверка: у хоста встреча в списке отменённых", async () => {
      await expect(hostBooking.bookingCancelCard(guest.name)).toBeVisible();
    });

    await test.step("Гость: открывает «Мои встречи»", async () => {
      await guestBooking.gotoBookings();
    });

    await test.step("Проверка: у гостя встреча в списке отменённых", async () => {
      await expect(guestBooking.bookingCancelCard(host.name)).toBeVisible();
    });
  });
});