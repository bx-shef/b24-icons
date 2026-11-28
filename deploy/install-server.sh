#!/usr/bin/env bash
# Установка или обновление публичного каталога иконок bx24 на сервере bx-shef: https://b24-icons.bx-shef.by
# Порт скрипта bx-shef/b24-ui (deploy/docs/install-server.sh) — тот же сервер и прокси; без чата, ключей и /mcp/.
#
# Сервер: обычный nginx в контейнере `proxy` (папка /home/bitrix/b24-proxy, сеть proxy-net), все сайты —
# блоками в одном conf.d/default.conf, сертификаты — certbot (webroot, том b24-ui_html) → том b24_letsencrypt,
# копии под именем домена — в томе b24-ui_certs; продление — renew-certs.sh по крону по списку DOMAINS.
# VIRTUAL_HOST/LETSENCRYPT_* из deploy/docker-compose.prod.yml здесь никто не читает (они для nginx-proxy).
#
# Скрипт идемпотентен: повторный запуск ничего не дублирует, недоделанное доделывает.
#   1. проверки: docker, прокси, тома, DNS домена → этот сервер;
#   2. каталог /home/bitrix/b24-icons-site: docker-compose.yml и .env;
#   3. контейнер b24-icons-site в сети proxy-net (образ ghcr.io/bx-shef/b24-icons-site:latest, Watchtower — по метке);
#   4. блок :80 в default.conf (проверка Let's Encrypt, редирект) и сертификат certbot;
#   5. блок :443;
#   6. домен — в DOMAINS скрипта продления;
#   7. проверка снаружи.
# Свои блоки в default.conf обёрнуты маркерами `# >>> b24-icons-site <домен> <имя>` … `# <<< …`: по ним скрипт
# находит уже добавленное (идемпотентность) и при сбое удаляет только блоки, добавленные в этот запуск, —
# чужие правки файла остаются. Копия всего файла (.backup-default.conf.<время>) — страховка для ручного
# восстановления, автоматически поверх файла не кладётся. nginx -t — перед каждым reload.
#
# Тома b24-ui_html и b24-ui_certs принадлежат прокси. У сайта свой проект compose (b24-icons-site) без томов,
# поэтому его up/down их не задевает. НИКОГДА не запускайте `docker compose down -v` и `docker volume rm` для них.
#
# Запуск (от пользователя bitrix, с доступом к docker):
#   curl -fsSLO https://raw.githubusercontent.com/bx-shef/b24-icons/main/deploy/install-server.sh && bash install-server.sh
# Необязательные переменные: DOMAIN, LETSENCRYPT_EMAIL, B24_DIR, B24_PROXY_DIR, SKIP_DNS_CHECK=1, SKIP_RENEW=1.
set -Eeuo pipefail
umask 077   # всё, что создаёт скрипт (.env, копии, журнал), — только владельцу

D=${DOMAIN:-b24-icons.bx-shef.by}
[[ $D =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || { echo "!! недопустимый DOMAIN: $D"; exit 1; }
NAME=b24-icons-site
PROJECT=b24-icons-site
IMAGE=ghcr.io/bx-shef/b24-icons-site:latest
DIR=${B24_DIR:-/home/bitrix/b24-icons-site}
PORT=8080
# путь, по которому видно, что каталог собран и отдаётся
PROBE=/data/search.json
P=${B24_PROXY_DIR:-/home/bitrix/b24-proxy}
CONF=$P/conf.d/default.conf
RENEW=$P/renew-certs.sh
short=${D%.bx-shef.by}
STAMP=$(date +%F-%H%M%S)
CERT_VOL=b24-ui_certs
HTML_VOL=b24-ui_html
LE_VOL=b24_letsencrypt

if [ -n "${LETSENCRYPT_EMAIL:-}" ]; then
  [[ $LETSENCRYPT_EMAIL =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$ ]] || { echo "!! недопустимый LETSENCRYPT_EMAIL"; exit 1; }
fi

echo "== 1. Проверки"
command -v docker >/dev/null 2>&1 || { echo "!! нет docker"; exit 1; }
docker info >/dev/null 2>&1 || { echo "!! нет доступа к docker — запускайте от пользователя bitrix (группа docker)"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "!! нет docker compose v2"; exit 1; }
for v in "$CERT_VOL" "$LE_VOL" "$HTML_VOL"; do
  docker volume inspect "$v" >/dev/null 2>&1 || { echo "!! нет тома $v — это не тот сервер или прокси устроен иначе"; exit 1; }
done
docker inspect proxy >/dev/null 2>&1 || { echo "!! нет контейнера proxy"; exit 1; }
[ -f "$CONF" ] || { echo "!! нет $CONF"; exit 1; }
docker network inspect proxy-net >/dev/null 2>&1 || { echo "!! нет сети proxy-net"; exit 1; }

# Продление проверяем ДО любых правок: иначе после выпуска сертификата пришлось бы падать на последнем шаге.
if [ "${SKIP_RENEW:-}" != 1 ]; then
  [ -f "$RENEW" ] || { echo "!! нет $RENEW — продление не настроено. Добавьте $D в него вручную и запустите с SKIP_RENEW=1"; exit 1; }
  [[ $D == *.bx-shef.by ]] || { echo "!! $D не на .bx-shef.by: renew-certs.sh ведёт короткие имена доменов bx-shef.by. Добавьте домен в продление вручную и запустите с SKIP_RENEW=1"; exit 1; }
  [ "$(grep -cE '^DOMAINS="[^"]*"$' "$RENEW")" = 1 ] || { echo "!! в $RENEW нет ровно одной строки вида DOMAINS=\"a b c\" — формат неожиданный. Добавьте $short в список вручную и запустите с SKIP_RENEW=1"; exit 1; }
fi

# Контейнер с нашим именем должен быть нашим (проект compose b24-icons-site): чужой не трогаем.
if docker inspect "$NAME" >/dev/null 2>&1; then
  owner=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$NAME" 2>/dev/null || true)
  [ "$owner" = "$PROJECT" ] || { echo "!! контейнер $NAME уже есть и не из проекта $PROJECT (проект: '${owner:-нет}') — разберитесь вручную"; exit 1; }
fi

certs_ok() { docker run --rm -v "$CERT_VOL":/c alpine sh -c "for e in crt key chain.pem dhparam.pem; do test -s /c/$D.\$e || exit 1; done" >/dev/null 2>&1; }

# DNS: без записи на этот сервер certbot не выпустит сертификат. Нужен только пока сертификата нет.
if ! certs_ok && [ "${SKIP_DNS_CHECK:-}" != 1 ]; then
  ip_dns=$(getent ahostsv4 "$D" 2>/dev/null | awk 'NR==1 { print $1 }' || true)
  ip_srv=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)
  if [ -z "$ip_dns" ]; then
    echo "!! DNS: $D не резолвится — создайте A-запись на ${ip_srv:-этот сервер} и запустите скрипт снова (или SKIP_DNS_CHECK=1)"; exit 1
  fi
  # Входящий адрес сервера может отличаться от исходящего (у bx-shef: сайты на 178.159.45.87, наружу —
  # 178.159.44.110), поэтому свой — и адрес из ipify, и адреса сайтов, которые уже обслуживает этот прокси.
  ok=""
  [ -n "$ip_srv" ] && [ "$ip_dns" = "$ip_srv" ] && ok="адрес сервера"
  if [ -z "$ok" ]; then
    for host in $(grep -oE '^[[:space:]]*server_name[[:space:]]+[a-z0-9.-]+;' "$CONF" | awk '{ print $2 }' | tr -d ';' | grep -vxF "$D" | sort -u | head -20); do
      if [ "$(getent ahostsv4 "$host" 2>/dev/null | awk 'NR==1 { print $1 }')" = "$ip_dns" ]; then ok="как у $host"; break; fi
    done
  fi
  [ -n "$ok" ] || { echo "!! DNS: $D → $ip_dns: это не адрес сервера (${ip_srv:-не определился}) и не адрес соседних сайтов прокси. Поправьте A-запись (или SKIP_DNS_CHECK=1)"; exit 1; }
  echo "DNS: $D → $ip_dns ($ok)"
fi

reload() { docker exec proxy nginx -t && docker exec proxy nginx -s reload; }
# Свои блоки default.conf — между маркерами. has_block — идемпотентность, add_block — дописать (копия файла
# перед первой правкой), remove_block — убрать только свой блок (файл читается заново: чужие правки остаются).
mark_b() { printf '# >>> b24-icons-site %s %s' "$D" "$1"; }
mark_e() { printf '# <<< b24-icons-site %s %s' "$D" "$1"; }
has_block() { grep -qxF "$(mark_b "$1")" "$CONF"; }
CONF_BACKUP=""
ADDED=()   # блоки, добавленные в этот запуск и ещё не подтверждённые рабочим :443
add_block() {
  local name=$1
  if [ -z "$CONF_BACKUP" ]; then CONF_BACKUP="$P/.backup-default.conf.$STAMP"; cp "$CONF" "$CONF_BACKUP"; fi
  { printf '\n'; mark_b "$name"; printf '\n'; cat; mark_e "$name"; printf '\n'; } >> "$CONF"
  ADDED+=("$name")
}
remove_block() {
  local name=$1 tmp
  grep -qxF "$(mark_e "$name")" "$CONF" || return 0
  tmp=$(mktemp "$P/.conf-edit.XXXXXX")
  awk -v b="$(mark_b "$name")" -v e="$(mark_e "$name")" '$0 == b { skip = 1; next } $0 == e { skip = 0; next } !skip { print }' "$CONF" > "$tmp"
  cat "$tmp" > "$CONF"; rm -f "$tmp"
}
rollback() {
  local n
  [ "${#ADDED[@]}" -gt 0 ] || return 0
  for n in "${ADDED[@]}"; do remove_block "$n"; done
  echo "!! сбой — убраны только блоки, добавленные этим запуском: ${ADDED[*]}"
  if docker exec proxy nginx -t >/dev/null 2>&1; then
    docker exec proxy nginx -s reload >/dev/null 2>&1 || true
  else
    echo "!! nginx -t не проходит и после отката — проверьте $CONF; копия файла до правок: ${CONF_BACKUP:-нет}"
  fi
}
cleanup() {
  local rc=$?
  rm -f "$DIR/.env.new" "$DIR/docker-compose.yml.new" 2>/dev/null || true
  [ "$rc" -eq 0 ] || rollback
}
trap cleanup EXIT

# Блок для домена без наших маркеров — чужой: не дописываем второй server на тот же домен.
if ! has_block 80 && grep -qF "server_name $D;" "$CONF"; then
  echo "!! в $CONF уже есть server_name $D без маркеров b24-icons-site — разберитесь вручную"; exit 1
fi

echo "== 2. Настройки сайта ($DIR)"
mkdir -p "$DIR"
chmod 700 "$DIR"
cd "$DIR"
[ -f .env ] || : > .env
chmod 600 .env
env_get() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }
# Значение → строка KEY= в .env (awk: в ключе бывают «/», «&», «|»). Не меняет остальные строки.
env_set() {
  local key="$1" value="$2"
  VALUE="$value" awk -v k="$key" '
    BEGIN { v = ENVIRON["VALUE"] }
    index($0, k "=") == 1 { if (!done) print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }
  ' .env > .env.new && mv .env.new .env
  chmod 600 .env
}
env_default() { [ -n "$(grep -E "^$1=" .env || true)" ] || env_set "$1" "$2"; }

env_set DOMAIN "$D"
[ -z "${LETSENCRYPT_EMAIL:-}" ] || env_set LETSENCRYPT_EMAIL "$LETSENCRYPT_EMAIL"

# Файл compose — для этого сервера: прокси здесь обычный nginx, VIRTUAL_HOST/LETSENCRYPT_* не нужны.
# Адрес сайта и номер Метрики вшиты в образ при сборке (секреты DOCS_SITE_URL, YANDEX_METRIKA_ID).
cat > docker-compose.yml.new <<'EOF'
# Сгенерировано install-server.sh (bx-shef/b24-icons, deploy/). Правки затираются при следующем запуске.
name: b24-icons-site

services:
  site:
    image: ghcr.io/bx-shef/b24-icons-site:latest
    container_name: b24-icons-site
    expose:
      - "8080"
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    mem_limit: 128m
    cpus: 0.5
    pids_limit: 64
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
        compress: "true"
    healthcheck:
      test: ["CMD", "wget", "-qO", "/dev/null", "http://127.0.0.1:8080/data/search.json"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - proxy-net
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

networks:
  proxy-net:
    external: true
EOF
mv docker-compose.yml.new docker-compose.yml

echo "== 3. Запуск"
COMPOSE=(docker compose -p "$PROJECT" --env-file .env -f docker-compose.yml)
"${COMPOSE[@]}" pull -q || { echo "!! образ $IMAGE не скачался (вход в ghcr есть? docker login ghcr.io)"; exit 1; }
"${COMPOSE[@]}" up -d
for _ in $(seq 1 60); do docker exec proxy wget -qO /dev/null "http://$NAME:$PORT$PROBE" 2>/dev/null && break; sleep 2; done
docker exec proxy wget -qO /dev/null "http://$NAME:$PORT$PROBE" || { echo "!! прокси не достучался до $NAME:$PORT — docker logs $NAME"; exit 1; }
echo "сайт отвечает в proxy-net"

echo "== 4. Сертификат"
if ! has_block 80; then
  add_block 80 <<EOF
server {
    server_name $D;
    access_log /var/log/nginx/access.log vhost;
    listen 80;
    location ^~ /.well-known/acme-challenge/ {
        allow all;
        root /usr/share/nginx/html;
        try_files \$uri =404;
    }
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
  reload
fi
if ! certs_ok; then
  if ! docker run --rm -v "$LE_VOL":/le alpine test -s "/le/live/$D/fullchain.pem"; then
    LOG="$DIR/certbot.log"
    MAIL=(--register-unsafely-without-email)
    [ -z "${LETSENCRYPT_EMAIL:-}" ] || MAIL=(--email "$LETSENCRYPT_EMAIL")
    docker run --rm -v "$LE_VOL":/etc/letsencrypt -v "$HTML_VOL":/usr/share/nginx/html certbot/certbot \
      certonly --webroot -w /usr/share/nginx/html -d "$D" --non-interactive --agree-tos "${MAIL[@]}" --cert-name "$D" \
      >"$LOG" 2>&1 || { cat "$LOG"; echo "!! certbot не выпустил сертификат (DNS домена смотрит на этот сервер?)"; exit 1; }
    tail -2 "$LOG"
  fi
  # dhparam: копия соседнего сайта, а если такого нет — новый (минута-другая).
  docker run --rm -v "$LE_VOL":/le:ro -v "$CERT_VOL":/certs alpine sh -c "
    cp /le/live/$D/fullchain.pem /certs/$D.crt && cp /le/live/$D/privkey.pem /certs/$D.key && cp /le/live/$D/chain.pem /certs/$D.chain.pem &&
    if [ ! -s /certs/$D.dhparam.pem ]; then
      src=\$(ls /certs/*.dhparam.pem 2>/dev/null | head -1)
      if [ -n \"\$src\" ]; then cp \"\$src\" /certs/$D.dhparam.pem; else apk add -q openssl && openssl dhparam -out /certs/$D.dhparam.pem 2048; fi
    fi"
  certs_ok || { echo "!! файлы сертификата неполные в томе $CERT_VOL"; exit 1; }
fi

echo "== 5. HTTPS"
# proxy_pass с переменной не даёт nginx упасть, пока контейнера нет, но требует resolver в конфиге.
if grep -q '^[[:space:]]*resolver ' "$CONF"; then
  PASS="        set \$up \"$NAME:$PORT\";
        proxy_pass http://\$up;"
else
  echo "(в default.conf нет resolver — proxy_pass без переменной: nginx не стартует, пока $NAME не в сети)"
  PASS="        proxy_pass http://$NAME:$PORT;"
fi
if ! has_block 443; then
  add_block 443 <<EOF
server {
    server_name $D;
    access_log /var/log/nginx/access.log vhost;
    listen 443 ssl;
    ssl_session_timeout 5m;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_certificate /etc/nginx/certs/$D.crt;
    ssl_certificate_key /etc/nginx/certs/$D.key;
    ssl_dhparam /etc/nginx/certs/$D.dhparam.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;
    location / {
$PASS
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  reload
fi
# Сайт по HTTPS работает: дальнейшие сбои (продление, проверка снаружи) блоки не откатывают.
ADDED=()
CONF_BACKUP=""

echo "== 6. Продление сертификата"
in_list() { grep -qE "^DOMAINS=\"([^\"]* )?$short( [^\"]*)?\"" "$RENEW"; }
if [ "${SKIP_RENEW:-}" = 1 ]; then
  echo "продление пропущено (SKIP_RENEW=1): добавьте $D в список $RENEW сами"
elif in_list; then
  grep '^DOMAINS=' "$RENEW"
else
  # Формат проверен в шаге 1: ровно одна строка DOMAINS="…". Правим только её.
  if cp "$RENEW" "$P/.backup-renew-certs.sh.$STAMP" && sed -i "0,/^DOMAINS=\"/s//DOMAINS=\"$short /" "$RENEW" && in_list; then
    grep '^DOMAINS=' "$RENEW"
  else
    echo "!! сайт работает, но $short не попал в DOMAINS ($RENEW) — сертификат не будет продлеваться."
    echo "   Вручную: sed -i 's/^DOMAINS=\"/DOMAINS=\"$short /' $RENEW"
  fi
fi

echo "== 7. Проверка снаружи"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$D$PROBE" || true)
if [ "$code" = 200 ]; then
  echo "https://$D$PROBE — 200"
else
  echo "https://$D$PROBE — ${code:-000}: с самого сервера его внешний адрес может не открываться (000) — проверьте с другой машины"
fi
echo "Готово. Проверьте: https://$D/ (каталог), https://$D$PROBE и https://$D/svg/outline-check-l.svg (200)."
echo "Лог: docker logs -f $NAME. Тома $HTML_VOL и $CERT_VOL — прокси, не удалять."
