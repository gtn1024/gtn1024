export const languages = {
  en: 'English',
  'zh-CN': '简体中文',
}

export const defaultLang = 'en'

export const ui = {
  en: {
    'site.title': 'Taoning Ge',
    'site.description': 'Taoning Ge - Personal Site & Blog',
    'nav.blog': 'Blog',
    'nav.tags': 'Tags',
    'home.tagline': ['Open Source Enthusiast', 'Software Developer'],
    'home.intro':
      "Hi, I'm Taoning Ge, a software developer and open-source enthusiast.",
    'home.skills.lang': 'Programming Languages',
    'home.skills.frameworks': 'Frameworks',
    'home.interests': 'Interests',
    'posts.title': 'Posts',
    'posts.older': 'Older posts →',
    'posts.newer': '← Newer',
    'tags.title': 'Tags',
    'tags.all': '← All Tags',
  },
  'zh-CN': {
    'site.title': 'Taoning Ge',
    'site.description': 'Taoning Ge - 个人站点与博客',
    'nav.blog': '博客',
    'nav.tags': '标签',
    'home.tagline': ['开源爱好者', '软件开发者'],
    'home.intro':
      '你好，我是葛涛宁，一名软件开发者和开源爱好者。',
    'home.skills.lang': '编程语言',
    'home.skills.frameworks': '框架',
    'home.interests': '兴趣',
    'posts.title': '博客',
    'posts.older': '更早的文章 →',
    'posts.newer': '← 更新的',
    'tags.title': '标签',
    'tags.all': '← 全部标签',
  },
} as const

export type UIKey = keyof (typeof ui)['en']
