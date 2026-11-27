/**
 * Shared configuration of the bx24 icon collection.
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const ICONS_DIR = resolve(ROOT, 'icons')
export const DATA_DIR = resolve(ROOT, 'data')

/** Iconify prefix: `i-bx24-outline-check-l` / `bx24:outline-check-l` */
export const PREFIX = 'bx24'

/** Icon sets (sub-folders of /icons). The set name becomes the first part of the icon name. */
export const SETS = [
  'outline',
  'solid',
  'main',
  'actions',
  'animated',
  'button',
  'button-specialized',
  'common-b24',
  'common-service',
  'contact-center',
  'crm',
  'editor',
  'file-type',
  'social',
  'specialized'
]

/** Sets whose colors are kept as is (multicolor artwork). */
export const KEEP_COLORS_SETS = new Set(['file-type'])

/** Icons (`set/name`) whose white (#fff) must not be turned into currentColor. */
export const KEEP_WHITE_ICONS = new Set(['outline/trashcan', 'solid/trashcan'])

/**
 * Colors turned into `currentColor`.
 * The list is inherited from the original @bitrix24/b24icons build so that
 * icons render exactly as before.
 */
export const MONO_COLORS = [
  '#fff', '#ccc', '#333', '#000',
  '#c9ccd0', '#bdc1c6', '#959ca4', '#828b95', '#525c69', '#535c69',
  '#9dcf00', '#8dbb00', '#95c500', '#34a853', '#289d37',
  '#4690fb', '#2a79a6', '#4285f4', '#0078d4', '#a77bde',
  '#ff0400', '#d61921', '#eb3c00', '#ea4335', '#fbbc05',
  '#ff9e00', '#ff6200', '#faa72c', '#15c674', '#1bce7b'
]

/** Normalizes a hex color to lowercase 6-digit form (or returns null). */
export function normalizeHex(value) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value).trim())
  if (!m) return null
  let hex = m[1].toLowerCase()
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return `#${hex}`
}

export const MONO_COLORS_SET = new Set(MONO_COLORS.map(normalizeHex))

/** Valid Iconify icon name part. */
export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const iconName = (set, name) => `${set}-${name}`
