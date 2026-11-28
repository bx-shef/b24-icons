// Тема — как у документации b24-ui (bx-shef/b24-ui docs/app/app.config.ts): useColorMode из b24-ui
// включается только с colorMode: true. По умолчанию — системная; светлая — .edge-light, тёмная — .dark.
export default defineAppConfig({
  toaster: {
    position: 'top-right' as const,
    duration: 2500,
    max: 3
  },
  b24ui: {},
  colorMode: true,
  colorModeInitialValue: 'auto' as const,
  colorModeTypeLight: 'edge-light' as const
})
