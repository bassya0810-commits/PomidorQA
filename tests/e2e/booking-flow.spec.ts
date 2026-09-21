import { test, expect } from "@playwright/test";
import { makeUser, registerUserViaApi, contextTracker } from "../helpers/user";
import { ProfilePage } from "../pages/ProfilePage";
import { BookingPage } from "../pages/BookingPage";

test.describe('Основной путь + гонка за слот: регистрация → навык → слот → поиск в каталоге → бронирование → «Мои встречи» у обоих → второй гость видит ошибку', () => {
    
 test.afterEach(async () => {
    await contextTracker.cleanup();
  });
  
  test ('основной путь + гонка за слот', async ({ browser }) => {
    test.setTimeout(60_000);

  const runId = crypto.randomUUID().slice(0, 10);
  const skillTag = `Playwright-demo-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);
  const guest2 = makeUser("guest2", runId);

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const guest2Context = await browser.newContext();

  contextTracker.track(hostContext);
  contextTracker.track(guestContext);
  contextTracker.track(guest2Context);
  
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const guest2Page = await guest2Context.newPage();
  
  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage); 
  const guestBooking = new BookingPage(guestPage);
  const guest2Booking = new BookingPage(guest2Page);


  await test.step("Хост: регистрируется в PomidorQA через API", async () => {
    await registerUserViaApi(hostPage, host);
  });
 
  await test.step('Хост: добавляет навык «могу помочь» в профиле', async () => {
    await hostProfile.goto();
    await hostProfile.addSkill(skillTag, "can_help")
  });

  await test.step('Хост: проверяет наличие навыка «могу помочь» в профиле', async () => {
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
  });

  await test.step("Хост: добавляет свободный слот на завтра", async () => {
    await hostBooking.gotoSlots()
    await hostBooking.addSlot()
  });

  await test.step("Хост: проверяет наличие свободного слота на завтра", async () => {
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  await test.step("Гость: регистрируется отдельным аккаунтом через API", async () => {
    await registerUserViaApi(guestPage, guest);
  });

  await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
    await guestBooking.searchBySkill(skillTag);
  });

  await test.step("Гость: проверяет карточку хоста в каталоге", async () => {
    await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });

  await test.step("Гость: открывает карточку хоста", async () => {
    await guestBooking.openCard(host.name);
  });

  await test.step("Гость: проверяет наличие имени хоста в карточке хоста", async () => {
    await expect(guestBooking.personName).toHaveText(host.name);
  });

  await test.step("Гость: дожидается появления слотов в календаре", async () => {
  await expect(async () => {
    const dayChip = guestBooking.bookingCalendarDay.first();
    if (!(await dayChip.isVisible().catch(() => false))) {
      await guestPage.reload();
    }
    await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
    await guestBooking.selectSlot();
  });

  await test.step("Гость: проверяет наличие диалога подтверждения бронирования", async () => {
    await expect(guestBooking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость2: регистрируется, ищет карточку хоста на тот же слот", async () => {
    await registerUserViaApi(guest2Page, guest2);
    await guest2Booking.searchBySkill(skillTag)
  });

  await test.step("Гость2: проверяет наличие карточки хоста в каталоге", async () => {
    await expect(guest2Booking.catalogCard.filter({ hasText: host.name })).toBeVisible();
  });


  await test.step("Гость2: открывает карточку хоста", async () => {
    await guest2Booking.openCard(host.name);
  });

  await test.step("Гость2: проверяет наличие имени хоста в карточке", async () => {
    await expect(guest2Booking.personName).toHaveText(host.name);
  });

  await test.step("Гость2: дожидается появления слотов в календаре", async () => {
    await expect(async () => {
      const dayChip = guest2Booking.bookingCalendarDay.first();
      if (!(await dayChip.isVisible().catch(() => false))) {
        await guest2Page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });
  });


  await test.step("Гость2: выбирает слот в карточке", async () => {
    await guest2Booking.selectSlot()
  });

  await test.step("Гость2: проверяет наличие диалога подтверждения бронирования", async () => {
    await expect(guest2Booking.bookingConfirmDialog).toBeVisible();
  });

  await test.step("Гость: подтверждает бронирование первым", async () => {
    await guestBooking.bookingConfirm();
  });

  await test.step("Гость: проверяет успешное подтверждение бронирования", async () => {
    await expect(guestBooking.bookingConfirmSuccess).toBeVisible();
  });

  await test.step("Гость2: пытается забронировать тот же слот вторым", async () => {
    await guest2Booking.bookingFail();
  });

  await test.step("Гость2: проверяет отображение ошибки подтверждения", async () => {
    await expect(guest2Booking.bookingConfirmError).toBeVisible();
  });

  await test.step("Гость: переходит в «Мои встречи»", async () => {
    await guestBooking.gotoBookings();
  });

  await test.step("Гость: видит бронирование в разделе «Мои встречи»", async () => {
    await expect(async () => {
      const card = guestBooking.bookingsCardName;
      await expect(card).toHaveText(host.name);
    }).toPass({ timeout: 10_000 });
  });

  await test.step("Хост: переходит в «Мои встречи»", async () => {
    await hostBooking.gotoBookings();
  });

  await test.step("Хост: тоже видит это бронирование в своих «Мои встречи»", async () => {
    await expect(async () => {
      const card = hostBooking.bookingsCardName;
      await expect(card).toHaveText(guest.name);
    }).toPass({ timeout: 10_000 });
  });
});
});