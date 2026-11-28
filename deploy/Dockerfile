# Публичный каталог иконок bx24: статическая страница (site/index.html) + собранная коллекция.
# Контекст сборки — корень репозитория. Сервер — deploy/README.md.

FROM node:22-bookworm-slim AS build
WORKDIR /src
RUN corepack enable
# Адрес сайта попадает в canonical, og, sitemap.xml и robots.txt. Пусто — без них.
ARG SITE_URL=""
# Номер счётчика Яндекс Метрики (публичный: он и так виден в коде страницы). Пусто — ни Метрики,
# ни баннера cookie.
ARG YANDEX_METRIKA_ID=""
ENV SITE_URL=${SITE_URL} \
    NUXT_PUBLIC_YANDEX_METRIKA_ID=${YANDEX_METRIKA_ID}
COPY . .
RUN corepack install && pnpm install --frozen-lockfile && pnpm build && pnpm site

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/site-dist /usr/share/nginx/html
EXPOSE 8080
LABEL org.opencontainers.image.source=https://github.com/bx-shef/b24-icons
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
