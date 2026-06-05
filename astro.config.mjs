import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'
import { unified } from 'unified'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export default defineConfig({
  site: 'https://gtn1024.me',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    tailwind(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          'zh-CN': 'zh-CN',
        },
      },
    }),
  ],
  markdown: {
    unified: unified().use(remarkMath).use(rehypeKatex),
    shikiConfig: {
      theme: 'github-light',
      dark: 'github-dark',
      wrap: true,
    },
  },
})
