import { test } from 'node:test'
import assert from 'node:assert/strict'
import { icons } from '@bxshefby/icons-json'

test('@iconify/vue renders bx24 icons', async () => {
  const { createSSRApp, h } = await import('vue')
  const { renderToString } = await import('@vue/server-renderer')
  const { Icon, addCollection } = await import('@iconify/vue')
  addCollection(icons)
  const html = await renderToString(createSSRApp({ render: () => h(Icon, { icon: 'bx24:outline-check-l', ssr: true }) }))
  assert.match(html, /<svg[^>]*viewBox="0 0 24 24"/)
  assert.match(html, /<path/)
})

test('@iconify/react renders bx24 icons', async () => {
  const React = await import('react')
  const { renderToString } = await import('react-dom/server')
  const { Icon, addCollection } = await import('@iconify/react')
  addCollection(icons)
  const html = renderToString(React.createElement(Icon, { icon: 'bx24:outline-check-l', ssr: true }))
  assert.match(html, /<svg[^>]*viewBox="0 0 24 24"/)
  assert.match(html, /<path/)
})
