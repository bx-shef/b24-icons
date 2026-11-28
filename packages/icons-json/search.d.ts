export interface Bx24IconVariant {
  /** Name in the collection, e.g. `outline-check-l` (`i-bx24-outline-check-l` in Nuxt) */
  name: string
  /** Icon set: `outline`, `solid`, `main`, … */
  set: string
  /** Size suffix: `l`, `m`, `s`, `xs`, or `''` when the icon has one size */
  size: string
}

export interface Bx24IconGroup {
  /** Name without set and size: `check`, `trash-bin` */
  base: string
  variants: Bx24IconVariant[]
  /** Catalog themes (Russian titles) */
  themes: string[]
  /** Search keywords, Russian and English */
  keywords: string[]
  /** Old `@bitrix24/b24icons-vue` components: `outline/CheckLIcon` */
  legacy: string[]
}

export interface Bx24SearchIndex {
  prefix: 'bx24'
  version: string
  groups: Bx24IconGroup[]
}

export interface Bx24SearchResult extends Bx24IconGroup {
  /** Suggested variant name */
  name: string
}

export interface Bx24SearchOptions {
  /** Default 64 */
  limit?: number
  /** Only groups that have a variant in this set */
  set?: string
  /** Only groups in this theme */
  theme?: string
}

export type Bx24Search = (query: string, options?: Bx24SearchOptions) => {
  query: string
  total: number
  results: Bx24SearchResult[]
}

export declare function createSearch(index: Bx24SearchIndex): Bx24Search
export declare function tokenize(text: string): string[]
export declare function preferredName(group: Bx24IconGroup, set?: string): string
