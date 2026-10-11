import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../app/ai/markdown'

describe('renderMarkdown', () => {
  it('escapes any HTML from the model', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)> **<b>tučně</b>**')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('<strong>&lt;b&gt;tučně&lt;/b&gt;</strong>')
  })

  it('only links http(s) URLs and cannot break out of the attribute', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('<a')
    const html = renderMarkdown('[x](https://a.cz/"onmouseover="alert(1))')
    expect(html).not.toMatch(/href="[^"]*"onmouseover/)
    expect(renderMarkdown('[web](https://example.org/a?b=1&c=2)'))
      .toContain('<a href="https://example.org/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">web</a>')
  })

  it('renders lists, headings, code and citations', () => {
    const html = renderMarkdown('## Kroky\n1. Změř pH [1]\n2. Uprav **EC** [2, 3]\n\n- `pH 6.3`\n- *pozor*')
    expect(html).toContain('<h4>Kroky</h4>')
    expect(html).toContain('<ol><li>Změř pH <button type="button" class="cite" data-cite="1">1</button></li>')
    expect(html).toContain('data-cite="2">2</button><button type="button" class="cite" data-cite="3">3</button>')
    expect(html).toContain('<ul><li><code>pH 6.3</code></li><li><em>pozor</em></li></ul>')
  })

  it('renders simple tables', () => {
    const html = renderMarkdown('| Týden | EC |\n|---|---|\n| 1 | 1.2 |')
    expect(html).toContain('<thead><tr><th>Týden</th><th>EC</th></tr></thead><tbody><tr><td>1</td><td>1.2</td></tr></tbody>')
  })

  it('keeps line breaks inside paragraphs', () => {
    expect(renderMarkdown('a\nb\n\nc')).toBe('<p>a<br>b</p><p>c</p>')
  })
})
