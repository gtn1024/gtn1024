import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'

export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())

  return rss({
    title: 'Taoning Ge',
    description: 'Blog by Taoning Ge',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt || '',
      link: `/zh/posts/${post.id.replace(/\.md$/, '')}`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-CN</language>',
  })
}
