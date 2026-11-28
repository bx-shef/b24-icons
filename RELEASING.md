# Выпуск в npm

Пакеты `@bxshefby/icons-json`, `@bxshefby/icons-svg` и `@bxshefby/icons-migrate` выходят вместе,
с одной версией. Схема — как в bx-shef/b24-js-sdk.

## Как идёт выпуск

1. Push в `main` ничего не публикует. `release-please.yml` держит открытым PR
   `chore(main): release X.Y.Z`: версия и журнал собираются из заголовков смерженных PR
   (conventional commits: `feat` поднимает минорную версию, `fix` — патч; до 1.0 `feat!` тоже минорную).
2. **Человек делает одно: сливает этот PR** (squash, как любой другой). Перед слиянием нужно
   дождаться обязательных проверок `ci` и `title`, см. [Проверки на PR выпуска](#проверки-на-pr-выпуска).
   После слияния release-please ставит тег `vX.Y.Z` и GitHub Release, затем запускает
   `npm-publish.yml` на теге.
3. `npm-publish.yml`:
   - job `build` (без OIDC-токена) сверяет версии с тегом, собирает, тестирует и упаковывает
     три tarball (`pnpm pack`);
   - job `publish` (окружение `npm-release`, OIDC) проверяет sha256 и публикует их с provenance.
     Уже опубликованное пропускается, поэтому упавший запуск можно перезапустить.

Версии с дефисом (`0.2.0-rc.1`) публикуются с dist-tag `next`, обычные — с `latest`.

Ручной запуск: Actions → NPM publish → Run workflow → выбрать **тег** `vX.Y.Z` (с ветки не публикует:
job `build` пропускается, а `publish` ждёт его и тоже пропускается).

## Проверки на PR выпуска

На `main` действует ruleset `Protect main`: PR, 0 одобрений, обязательные проверки `ci` и `title`,
слияние только squash, ветка должна быть обновлена до `main` (strict). У владельца (роль admin)
есть bypass.

PR выпуска создаёт release-please от имени `GITHUB_TOKEN`. Запуски его проверок GitHub удерживает
в состоянии `action_required`: job не создаются, check run нет, ruleset ждёт `ci` и `title`, и PR
остаётся `blocked` («Required status check is expected»). Так это выглядит на release PR в
bx-shef/b24-js-sdk (#55), разобрано в bx-shef/b24-ui (`.github/contributing/releasing.md`,
«Approving the release PR's CI»). Проверено на выпуске 0.1.0 (PR #32, 2026-11-28): так и было —
`ci`, `title`, `site-image`, `dependency-review` стояли в `action_required`, одно нажатие владельца
*Approve and run* их запустило, bypass не понадобился.

1. Открыть PR выпуска → вкладка Checks / Actions: если запуск ждёт подтверждения, подтвердить его
   (*Approve and run*) и дождаться зелёных `ci` и `title`.
2. Если после слияния любого другого PR в `main` кнопка слияния заблокирована — ветка отстала
   (strict): нажать *Update branch*, подтвердить новый запуск, дождаться проверок.
3. Запасной путь для владельца: bypass в ruleset (*Merge without waiting for requirements to be
   met*). Использовать только когда проверки заведомо не могут появиться.

## Настройки владельца (один раз)

| Где | Что |
| --- | --- |
| npmjs.com | Имён ещё нет в реестре, а Trusted Publisher настраивается только у существующего пакета. Для каждого из трёх пакетов один раз опубликовать заглушку (команды ниже). |
| npmjs.com → пакет → Settings → Trusted Publisher → GitHub Actions | Для **каждого** из трёх пакетов: Organization or user `bx-shef`, Repository `b24-icons`, Workflow filename `npm-publish.yml`, Environment name `npm-release`, **Allow npm publish — отметить**. |
| npmjs.com → пакет → Publishing access | *Require two-factor authentication and disallow tokens* — доверенной публикации не мешает. |
| GitHub → Settings → Environments | Создать `npm-release`; *Deployment branches and tags* → Selected: `main` и теги `v*`; без Required reviewers. |
| GitHub → Settings → Actions → General → Workflow permissions | *Allow GitHub Actions to create and approve pull requests* (иначе release-please не откроет PR). |
| GitHub → Settings → Secrets and variables → Actions → Variables | `NPM_RELEASE` = `true` — выключатель всей схемы. |
| GitHub → Settings → Advanced Security | *Private vulnerability reporting* — Enable (на него ведёт `SECURITY.md`). |
| GitHub → Settings → Advanced Security | *Dependabot alerts* и *Dependabot security updates* — Enable; *Secret scanning* и *Push protection* — Enable; *Code scanning* → *Default setup* (CodeQL). |
| GitHub → Settings → Rules → Rulesets | `Protect main` на default-ветку: запрет удаления и force-push, PR с 0 одобрений, только squash, обязательные проверки `ci` и `title` со strict, bypass для роли Repository admin. |

Заглушки (из любой папки, под своим аккаунтом npm):

```bash
for p in icons-json icons-svg icons-migrate; do
  d=$(mktemp -d) && cd "$d" &&
  printf '{"name":"@bxshefby/%s","version":"0.0.0-reserve","description":"reserved, see https://github.com/bx-shef/b24-icons","license":"MIT"}\n' "$p" > package.json &&
  npm publish --access public --tag reserve &&
  npm deprecate "@bxshefby/$p@0.0.0-reserve" "placeholder, use a real version" && cd -
done
```

Старый пакет — пометить устаревшим:

```bash
npm deprecate @bxshefby/icons-vue "Use @bxshefby/icons-json (Iconify collection bx24): https://github.com/bx-shef/b24-icons"
```

## Первый выпуск — 0.1.0 (2026-11-28)

Как прошёл, чтобы следующий раз не наступить на то же:

1. **Версия.** Для самого первого выпуска release-please предложил `1.0.0` и не учёл
   `bump-minor-pre-major`. Исправлено настройкой `"initial-version": "0.1.0"` (PR #33); дальше версии
   растут как обычно (до 1.0 `feat` — минорная).
2. **Заглушки в npm.** После `npm publish` пакет виден в реестре только через несколько минут, поэтому
   `npm deprecate` сразу после публикации отвечает 404 — повторить позже. При входе через браузер
   (2FA) у пакетов дополнительно появилась версия `0.0.0-stage` — ни на что не влияет.
3. **Trusted Publisher.** Первая публикация упала на `npm publish`: `404 … you do not have permission`,
   хотя provenance уже был подписан. Причина — настройки Trusted Publisher пакета не совпадали с
   запуском (проверить: `bx-shef` / `b24-icons` / `npm-publish.yml` / `npm-release`, отмечено
   *Allow npm publish*). После правки — *Re-run failed jobs* у запуска «NPM publish»: сборка не
   повторяется, публикуется тот же tarball, опубликованное пропускается.
4. Итог: `@bxshefby/icons-json`, `@bxshefby/icons-svg`, `@bxshefby/icons-migrate` 0.1.0 с provenance,
   dist-tag `latest`.
