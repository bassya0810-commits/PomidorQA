# PomidorQA  — сервис коротких встреч для QA/IT-специалистов.

Адрес площадки:[PomidorQA](https://aiqa.su/pomidorqa)

## Содержание репозитория

Репозиторий содержит пирамиду автотестов для продукта.
- 10 unit-тестов
- 8 API-тестов
- 19 E2E тестов

### Сводка времени прогона

Время измерено отдельно для каждого уровня через Bash `time`, последовательно, на текущем стенде.

- Unit: 10 тестов, 2,544 с.
- API: 8 тестов, 2,467 с.
- E2E: 19 тестов, 255,644 с (примерно 4 мин 16 с).
- Всего: 37 тестов, 260,655 с (примерно 4 мин 21 с).

### Оценка покрытия требований

Ниже — краткая сводка покрытия по пунктам требований из [requirements.md](requirements.md). Порядок соответствует требованиям, чтобы можно было отслеживать и закрывать пробелы.

1. Регистрация и вход — Частично
	- Проверки:
	  - Пароль не короче 8 символов: [tests/unit/slots.spec.ts](tests/unit/slots.spec.ts).
	  - Неверный логин: [tests/e2e/login-error.spec.ts](tests/e2e/login-error.spec.ts).
	  - Регистрация и дубликат email: [tests/api/booking-api.spec.ts](tests/api/booking-api.spec.ts).

2. Профиль — ✅
	- Проверки:
	  - Имя, Telegram, часовой пояс, биография и сохранение после reload: [tests/e2e/profile-flow.spec.ts](tests/e2e/profile-flow.spec.ts).

3. Навыки — ✅
	- Проверки:
	  - Добавление и типы навыков: [tests/e2e/profile-flow.spec.ts](tests/e2e/profile-flow.spec.ts).
	  - Дубли навыков: [tests/e2e/profile-skill-duplicate.spec.ts](tests/e2e/profile-skill-duplicate.spec.ts).
	  - Пробелы в навыках: [tests/e2e/profile-skill-whitespace.spec.ts](tests/e2e/profile-skill-whitespace.spec.ts).

4. Слоты доступности — Частично
	- Проверки:
	  - Слот в прошлом: [tests/e2e/slot-past.spec.ts](tests/e2e/slot-past.spec.ts).
	  - Пересечение и формат времени: [tests/unit/slots.spec.ts](tests/unit/slots.spec.ts).

5. Каталог участников — ✅
	- Проверки:
	  - Поиск без учёта регистра: [tests/e2e/catalog-search-case-insensitive.spec.ts](tests/e2e/catalog-search-case-insensitive.spec.ts).
	  - Пустой каталог: [tests/e2e/catalog-search-empty.spec.ts](tests/e2e/catalog-search-empty.spec.ts).

6. Страница участника — Частично
	- Проверки: основной сценарий и карточка хоста в [tests/e2e/booking-flow.spec.ts](tests/e2e/booking-flow.spec.ts).
	- Пробел: отдельный сценарий для “участник без будущих слотов не виден”.

7. Бронирование — ✅
	- Проверки:
	  - Свободное бронирование и гонка за слот: [tests/api/booking-api.spec.ts](tests/api/booking-api.spec.ts).
	  - Основной пользовательский сценарий: [tests/e2e/booking-flow.spec.ts](tests/e2e/booking-flow.spec.ts).
	  - Ошибка при бронировании собственного слота: [tests/e2e/booking-own-slot.spec.ts](tests/e2e/booking-own-slot.spec.ts).

8. Отмена бронирования — ✅
	- Проверки:
	  - Отмена гостем: [tests/e2e/booking-cancel.spec.ts](tests/e2e/booking-cancel.spec.ts).
	  - Отмена хостом: [tests/e2e/booking-cancel-host.spec.ts](tests/e2e/booking-cancel-host.spec.ts).
	  - Повторное бронирование после отмены: [tests/e2e/booking-rebook-after-cancel.spec.ts](tests/e2e/booking-rebook-after-cancel.spec.ts).

9. Мои встречи — ✅
	- Проверки:
	  - Ближайшие встречи: [tests/e2e/booking-flow.spec.ts](tests/e2e/booking-flow.spec.ts).
	  - Отменённая встреча гостем: [tests/e2e/booking-cancel.spec.ts](tests/e2e/booking-cancel.spec.ts).
	  - Отменённая встреча хостом: [tests/e2e/booking-cancel-host.spec.ts](tests/e2e/booking-cancel-host.spec.ts).

10. Критерии приёмки — ✅
	- Проверки:
	  - Основной happy path: [tests/e2e/booking-flow.spec.ts](tests/e2e/booking-flow.spec.ts).
	  - Нельзя бронировать собственный слот: [tests/e2e/booking-own-slot.spec.ts](tests/e2e/booking-own-slot.spec.ts).
	  - Повторное бронирование после отмены: [tests/e2e/booking-rebook-after-cancel.spec.ts](tests/e2e/booking-rebook-after-cancel.spec.ts).
	  - Нельзя создать слот в прошлом: [tests/e2e/slot-past.spec.ts](tests/e2e/slot-past.spec.ts).

Итог по требованиям MVP: покрытие оценивается примерно в 75–80% по бизнес-пунктам, критичные сценарии закрыты. Основные пробелы к следующей итерации — удаление навыка, запрет отмены за 1 час до встречи, гость без регистрации не может бронировать, участник без будущих слотов не виден в каталоге.

## Установка

```bash
npm install
npx playwright install chromium
```

## Запуск тестов

```bash
npm run test:unit   # Unit — без сети и без браузера
npm run test:api    # API — HTTP-запросы к локальному мок-серверу
npm run test:e2e    # E2E — реальный браузер на живом aiqa.su/pomidorqa
npm test            # все три уровня сразу
npm run report      # открыть HTML-отчёт последнего прогона
```

В GitHub Actions workflow `Playwright CI` публикует в Summary каждого запуска количество
`passed`, `failed`, `skipped`, `flaky`, длительность прогона и детализацию по каждому тестовому файлу.
Отдельно отображаются ошибки и предупреждения линтера по файлам. Полный HTML-отчёт Playwright
сохраняется artifact'ом запуска на 14 дней.

Summary доступен на странице запуска GitHub Actions во вкладке **Summary**. Он также печатается
в логе шага `Publish CI summary`. Если любой тест или lint завершился ошибкой, шаг `Finish with
check result` завершает workflow с ошибкой после публикации отчёта.

По умолчанию E2E-тесты бьют в продакшен (`https://aiqa.su`). Если нужно направить на локальный
стенд — переопредели `POMIDORQA_BASE_URL`:

```bash
POMIDORQA_BASE_URL=http://localhost:3000 npx playwright test --project=e2e
```

## Структура

```
src/pyramid/       — вспомогательный код: чистые функции (unit) и локальный мок-сервер (api)
tests/unit/        — пересечение слотов по времени, форматирование времени, валидация пароля
tests/api/         — регистрация, бронирование, гонка за слот — через HTTP к локальному мок-серверу
tests/e2e/         — реальный сценарий бронирования и негативный сценарий логина в браузере