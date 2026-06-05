import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const POSTS_DIR = 'src/content/posts'
const PUBLIC_DIR = 'public/posts'
const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))

let total = 0
let warnings = 0

for (const file of files) {
  const filepath = join(POSTS_DIR, file)
  let content = readFileSync(filepath, 'utf-8')
  const slug = file.replace(/\.md$/, '')
  const assetDir = join(PUBLIC_DIR, slug)

  // Replace ![alt](./slug/filename) → ![alt](/posts/slug/filename)
  // Only if the file exists
  content = content.replace(
    /!\[([^\]]*)\]\(\.\/([^/]+)\/([^)]+)\)/g,
    (_, alt, postSlug, filename) => {
      const fullPath = join(PUBLIC_DIR, postSlug, filename)
      if (existsSync(fullPath)) {
        total++
        return `![${alt}](/posts/${postSlug}/${filename})`
      } else {
        warnings++
        console.warn(`MISSING: ${fullPath}`)
        return `![${alt}](/posts/${postSlug}/${filename})`
      }
    }
  )

  writeFileSync(filepath, content)
}

console.log(`\nFixed: ${total}, Warnings: ${warnings}`)
