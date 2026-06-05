import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const POSTS_DIR = 'src/content/posts'
const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))

let totalReplaced = 0

for (const file of files) {
  const filepath = join(POSTS_DIR, file)
  let content = readFileSync(filepath, 'utf-8')

  const slug = file.replace(/\.md$/, '')
  const assetDir = join(POSTS_DIR, slug)

  // Replace {% asset_img filename alt_text %}
  // or {% asset_img filename %}
  const regex = /\{%\s*asset_img\s+(\S+)(?:\s+(.+?))?\s*%\}/g
  let count = 0
  content = content.replace(regex, (_, filename, alt) => {
    count++
    const altText = alt ? alt.trim() : filename
    return `![${altText}](./${filename})`
  })

  if (count > 0) {
    totalReplaced += count
    writeFileSync(filepath, content)
    console.log(`${file}: replaced ${count} tags`)
  }
}

console.log(`\nTotal: ${totalReplaced} asset_img tags replaced`)
