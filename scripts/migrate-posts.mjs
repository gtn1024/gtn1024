import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const POSTS_DIR = 'src/content/posts'
const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))

for (const file of files) {
  const filepath = join(POSTS_DIR, file)
  let content = readFileSync(filepath, 'utf-8')

  // Replace <!-- more --> with empty line
  content = content.replace(/<!--\s*more\s*-->/g, '')

  // Fix categories: flatten Hexo nested format
  // - [编程语言, Java] → - 编程语言\n  - Java  (keep as flat list)
  content = content.replace(
    /^categories:\n((?:- .+\n)*)/gm,
    (match, lines) => {
      const items = []
      for (const line of lines.trim().split('\n')) {
        const m = line.match(/^- \[(.+)\]$/)
        if (m) {
          items.push(...m[1].split(',').map((s) => `- ${s.trim()}`))
        } else {
          items.push(line)
        }
      }
      return `categories:\n${items.join('\n')}\n`
    }
  )

  // Add draft: true for draft posts
  if (file === 'jvm-and-java-architecture.md') {
    if (!content.includes('draft:')) {
      content = content.replace(/^---\n/, '---\ndraft: true\n')
    }
  }

  writeFileSync(filepath, content)
}

console.log(`Processed ${files.length} files`)
