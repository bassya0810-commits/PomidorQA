import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, contextTracker } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";
import { BookingPage } from "../pages/BookingPage";

test.describe("Бронирование: слот после отмены снова доступен", () => {
  test.afterEach(async () => {
    await contextTracker.cleanup();
  });

  test("освободившийся после отмены слот бронирует другой участник", async ({ browser }) => {
    test.setTimeout(60_000);

    const runId = crypto.randomUUID().slice(0, 10);
    const skillTag = `Rebook-${runId}`;
    const host = makeUser("host-rebook", runId);
    const guest = makeUser("guest-rebook", runId);
    const secondGuest = makeUser("second-guest-rebook", runId);
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const secondGuestContext = await browser.newContext();
    contextTracker.track(hostContext);
    contextTracker.track(guestContext);
    contextTracker.track(secondGuestContext);

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    const secondGuestPage = await secondGuestContext.newPage();
    const hostProfile = new ProfilePage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);
    const secondGuestBooking = new BookingPage(secondGuestPage);

    await test.step("Хост: регистрируется через API", async () => {
      await registerUserViaApi(hostPage, host);
    });

    await test.step("Хост: добавляет навык и свободный слот", async () => {
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
      await hostBooking.gotoSlots();
      await hostBooking.addSlot();
    });

    await test.step("Проверка: слот создан и виден хосту", async () => {
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Первый гость: регистрируется через API", async () => {
      await registerUserViaApi(guestPage, guest);
    });

    await test.step("Первый гость: находит и открывает карточку хоста", async () => {
      await guestBooking.searchBySkill(skillTag);
      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
      await guestBooking.openCard(host.name);
    });

    await test.step("Проверка: на странице хоста отображается имя", async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step("Первый гость: ждёт доступный слот", async () => {
      await expect(async () => {
        const dayChip = guestBooking.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await guestPage.reload();
        }
        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Первый гость: выбирает слот и подтверждает бронирование", async () => {
      await guestBooking.selectSlot();
      await guestBooking.bookingConfirm();
    });

    await test.step("Первый гость: отменяет встречу", async () => {
      await guestBooking.gotoBookings();
      await guestBooking.cancelBooking();
    });

    await test.step("Проверка: у первого гостя встреча в списке отменённых", async () => {
      await expect(guestBooking.bookingCancelCard(host.name)).toBeVisible();
    });

    await test.step("Второй гость: регистрируется через API", async () => {
      await registerUserViaApi(secondGuestPage, secondGuest);
    });

    await test.step("Второй гость: ищет хоста и открывает карточку", async () => {
      await secondGuestBooking.searchBySkill(skillTag);
      await secondGuestBooking.openCard(host.name);
    });

    await test.step("Проверка: страница хоста открылась у второго гостя", async () => {
      await expect(secondGuestBooking.personName).toHaveText(host.name);
    });

    await test.step("Второй гость: ждёт освободившийся слот", async () => {
      await expect(async () => {
        const dayChip = secondGuestBooking.bookingCalendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await secondGuestPage.reload();
        }
        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 15_000 });
    });

    await test.step("Второй гость: выбирает свободный слот", async () => {
      await secondGuestBooking.selectSlot();
      await expect(secondGuestBooking.bookingConfirmDialog).toBeVisible();
    });

    await test.step("Второй гость: подтверждает повторное бронирование", async () => {
      await secondGuestBooking.bookingConfirm();
      await secondGuestBooking.gotoBookings();
    });

    await test.step("Проверка: второй гость видит эту встречу в своих ближайших", async () => {
      await expect(secondGuestBooking.bookingsCardName).toHaveText(host.name);
    });
  });
});