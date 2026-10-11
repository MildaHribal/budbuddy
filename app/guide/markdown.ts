// Guide markdown: input is HTML-escaped first, only our own tags are emitted.
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ESCAPES[c] ?? c)

function inline(escaped: string): string {
  const slots: string[] = []
  const keep = (html: string) => `\u0000${slots.push(html) - 1}\u0000`
  let s = escaped.replace(/\[([^\]]+)\]\((\/guide[^\s)]*)\)/g, (_, text: string, url: string) =>
    keep(`<a href="${url}" data-internal>${text}</a>`))
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text: string, url: string) =>
    keep(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`))
  // literal asterisks: \* escapes and in-word runs like "F***"
  s = s.replace(/\\\*|(?<=\w)\*{3,}/g, m => keep(m.replace(/\\/g, '')))
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>')
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => slots[Number(i)] ?? '')
}

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

export function renderGuideMarkdown(source: string): string {
  // eslint-disable-next-line no-control-regex
  const lines = escapeHtml(source.replace(/\r\n/g, '\n').replace(/\u0000/g, '')).split('\n')
  const out: string[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!line.trim()) {
      flush()
      continue
    }
    const heading = line.match(/^#{2,4}\s+(.*)$/)
    if (heading) {
      flush()
      out.push(`<h4>${inline(heading[1] ?? '')}</h4>`)
      continue
    }
    const kind = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null
    if (kind) {
      flush()
      const re = kind === 'ul' ? BULLET : NUMBERED
      const items: string[] = []
      while (i < lines.length && re.test(lines[i] ?? '')) {
        items.push(`<li>${inline((lines[i] ?? '').match(re)?.[1] ?? '')}</li>`)
        i++
      }
      i--
      out.push(`<${kind}>${items.join('')}</${kind}>`)
      continue
    }
    para.push(line.trim())
  }
  flush()
  return out.join('')
}
