# Публичный каталог иконок

Каталог — Nuxt-приложение `site/` на b24-ui, статическая генерация (`pnpm site`): страница, коллекция в `/data/`
(`icons.json`, `search.json`, `metadata.json`) и файл на каждую иконку в `/svg/<имя>.svg`. Отдаёт nginx.
Схема та же, что у сайта bx-shef/b24-js-sdk: образ в ghcr.io, на сервере — compose за общим прокси,
обновляет общий Watchtower.

## Образ

- `deploy/Dockerfile`, контекст — корень репозитория. Сборка: `pnpm install`, `pnpm build`, `pnpm site`
  (`nuxt generate` в `site/`).
  В образе — `nginxinc/nginx-unprivileged` с `site-dist/`, порт 8080, процесс без root.
- `deploy/nginx.conf`: CSP (страница не ходит наружу), `nosniff`, gzip для JSON и SVG.
  `index.html` и JSON отдаются с `no-cache`: браузер переспрашивает, но по ETag получает 304.
- Воркфлоу `.github/workflows/site-image.yml`:
  - на PR — сборка и дымовая проверка: контейнер с теми же ограничениями, что в compose;
  - на push в `main` — ещё и публикация `ghcr.io/bx-shef/b24-icons-site:latest` и `:sha-…`.
- Адрес сайта для canonical, og, `sitemap.xml` и `robots.txt` — секрет репозитория `DOCS_SITE_URL`
  (или переменная `SITE_URL`, она главнее; Settings → Secrets and variables → Actions):
  `https://b24-icons.bx-shef.by`. Пусто — без них. Так же, как в bx-shef/b24-js-sdk.
- Яндекс Метрика — номер счётчика в секрете репозитория `YANDEX_METRIKA_ID`, вшивается в образ при сборке.
  Метрика грузится только после согласия посетителя в баннере cookie (`site/public/cookie-consent.js` —
  копия из bx-shef/b24-js-sdk, без правок), без Вебвизора; в подвале — «Настроить cookie».
  Пусто — ни счётчика, ни баннера.
- Пакет в ghcr после первой публикации может оказаться приватным. Watchtower на сервере входит в ghcr,
  так что это не мешает. Чтобы образ можно было скачать без входа: Packages → b24-icons-site →
  Package settings → Change visibility → Public.

## Сервер

Сайт: **https://b24-icons.bx-shef.by**. Сервер bx-shef, тот же, что у b24-js-sdk (подробно — `deploy/README.md` в bx-shef/b24-js-sdk):

- прокси — nginx в контейнере `proxy` (`/home/bitrix/b24-proxy`, сеть `proxy-net`); все сайты — блоками
  в `conf.d/default.conf`;
- сертификаты — certbot (webroot) в томах `b24_letsencrypt` / `b24-ui_certs`, продление —
  `renew-certs.sh` по крону;
- обновление — Watchtower по метке в compose.

**Установка** — один скрипт на сервере от пользователя `bitrix`. Перед запуском DNS A-запись домена
должна указывать на сервер.

```bash
curl -fsSLO https://raw.githubusercontent.com/bx-shef/b24-icons/main/deploy/install-server.sh && bash install-server.sh
```

Скрипт — копия скрипта b24-js-sdk без чата и ключей. Он идемпотентен:

1. поднимает контейнер `b24-icons-site`;
2. выпускает сертификат;
3. дописывает блоки `:80` и `:443` в `default.conf`, перед этим сохранив его копию; при сбое возвращает её;
4. добавляет домен в продление сертификатов.

Проверка снаружи: `https://<домен>/`, `https://<домен>/data/search.json` и `https://<домен>/svg/outline-check-l.svg` — 200.
С самого сервера его внешний адрес может не открываться — это не ошибка.
