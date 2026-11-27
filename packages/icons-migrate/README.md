# @bxshefby/icons-migrate

Moves a project from `@bitrix24/b24icons-vue` components to `bx24` icon names
([`@bxshefby/icons-json`](https://www.npmjs.com/package/@bxshefby/icons-json)).

```bash
npx @bxshefby/icons-migrate src            # dry run
npx @bxshefby/icons-migrate src --write    # apply
npx @bxshefby/icons-migrate lookup outline/CheckLIcon
```

```diff
- import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'
- <B24Button :icon="CheckLIcon" />
+ <B24Button icon="i-bx24-outline-check-l" />
```

Options: `--component B24Icon|UIcon|Icon`, `--prefix i-bx24-|bx24:`, `--name-prop name|icon`.

- `legacy-map.json` — every old component → new name.
- `skills/bx24-icons-migration/SKILL.md` — step-by-step instructions for an AI agent.

Docs: https://github.com/bx-shef/b24-icons#migration
