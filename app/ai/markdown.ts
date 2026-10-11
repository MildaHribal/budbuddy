// Small Markdown renderer. Input is HTML-escaped first and only our own tags are emitted,
// so model output cannot inject HTML; links are http(s) only.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ESCAPES[c] ?? c)

function inline(escaped: string): string {
  const slots: string[] = []
  const keep = (html: string) => `\u0000${slots.push(html) - 1}\u0000`

  let s = escaped.replace(/`([^`]+)`/g, (_, code: string) => keep(`<code>${code}</code>`))
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text: string, url: string) =>
    keep(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`))
  s = s.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, list: string) =>
    list.split(/\s*,\s*/).map(n => keep(`<button type="button" class="cite" data-cite="${n}">${n}</button>`)).join(''))
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>')
  s = s.replace(/(^|[^_\w])_(?!\s)(.+?)(?<!\s)_(?!\w)/g, '$1<em>$2</em>')
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => slots[Number(i)] ?? '')
}

const LIST_ITEM = /^\s*(?:[-*+•]|(\d+)[.)])\s+(.*)$/
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()))

export function renderMarkdown(source: string): string {
  // eslint-disable-next-line no-control-regex
  const lines = escapeHtml(source.replace(/\r\n/g, '\n').replace(/\u0000/g, '')).split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (/^\s*```/.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i] ?? '')) code.push(lines[i++] ?? '')
      i++
      out.push(`<pre><code>${code.join('\n')}</code></pre>`)
      continue
    }

    if (!line.trim()) {
      i++
      continue
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = Math.min(5, (heading[1]?.length ?? 1) + 2)
      out.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`)
      i++
      continue
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr>')
      i++
      continue
    }

    if (line.includes('|') && TABLE_SEP.test(lines[i + 1] ?? '')) {
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && (lines[i] ?? '').includes('|') && (lines[i] ?? '').trim()) rows.push(cells(lines[i++] ?? ''))
      out.push(`<div class="md-table"><table><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      continue
    }

    if (/^\s*&gt;\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^\s*&gt;\s?/.test(lines[i] ?? '')) quote.push(inline((lines[i++] ?? '').replace(/^\s*&gt;\s?/, '')))
      out.push(`<blockquote>${quote.join('<br>')}</blockquote>`)
      continue
    }

    const first = line.match(LIST_ITEM)
    if (first) {
      const ordered = first[1] != null
      const items: string[] = []
      while (i < lines.length) {
        const m = (lines[i] ?? '').match(LIST_ITEM)
        if (m && (m[1] != null) === ordered) {
          const nested = /^\s{2,}/.test(lines[i] ?? '')
          items.push(`<li${nested ? ' class="nested"' : ''}>${inline(m[2] ?? '')}</li>`)
          i++
        } else if ((lines[i] ?? '').trim() && /^\s{2,}\S/.test(lines[i] ?? '') && items.length) {
          items[items.length - 1] = (items[items.length - 1] ?? '').replace(/<\/li>$/, `<br>${inline((lines[i] ?? '').trim())}</li>`)
          i++
        } else {
          break
        }
      }
      const start = ordered && first[1] !== '1' ? ` start="${Number(first[1])}"` : ''
      out.push(ordered ? `<ol${start}>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`)
      continue
    }

    const para: string[] = []
    while (i < lines.length) {
      const l = lines[i] ?? ''
      if (!l.trim() || LIST_ITEM.test(l) || /^\s*(#{1,6}\s|```|&gt;)/.test(l)) break
      para.push(inline(l.trim()))
      i++
    }
    out.push(`<p>${para.join('<br>')}</p>`)
  }

  return out.join('')
}
