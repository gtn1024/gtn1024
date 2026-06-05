import { ui, defaultLang, type UIKey } from './ui'

export type Lang = keyof typeof ui

const pathToLang: Record<string, Lang> = {
  zh: 'zh-CN',
}

export function getLangFromUrl(url: URL): Lang {
  const [, segment] = url.pathname.split('/')
  if (segment in pathToLang) return pathToLang[segment]
  if (segment in ui) return segment as Lang
  return defaultLang
}

export function useTranslations(lang: Lang) {
  return function t(key: UIKey) {
    return ui[lang][key] || ui[defaultLang][key]
  }
}

export function getLocalizedPath(path: string, lang: Lang): string {
  if (lang === defaultLang) return path
  return `/${lang}${path}`
}

const langPrefixMap: Record<Lang, string> = {
  en: '',
  'zh-CN': '/zh',
}

const blogOnlyPrefixes = ['/posts', '/tags']

export function getAlternateLanguageUrl(currentUrl: URL): string {
  const lang = getLangFromUrl(currentUrl)
  const altLang: Lang = lang === 'en' ? 'zh-CN' : 'en'
  const prefix = langPrefixMap[lang]
  let pathWithoutLang = prefix
    ? currentUrl.pathname.slice(prefix.length) || '/'
    : currentUrl.pathname

  if (altLang === 'en' && blogOnlyPrefixes.some((p) => pathWithoutLang.startsWith(p))) {
    pathWithoutLang = '/'
  }

  const altPrefix = langPrefixMap[altLang]
  return `${altPrefix}${pathWithoutLang}`
}

export function formatDate(d: Date, lang: Lang): string {
  const locale = lang === 'en' ? 'en-US' : 'zh-CN'
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateShort(d: Date, lang: Lang): string {
  const locale = lang === 'en' ? 'en-US' : 'zh-CN'
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
