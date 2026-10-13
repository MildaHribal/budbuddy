// Tiny PDF writer: every page is one full-bleed JPEG (pages are drawn on a canvas, so Czech text and Onest just work).

export interface PdfPage {
  jpeg: Uint8Array
  /** pixel size of the JPEG */
  width: number
  height: number
}

/** A4 in PDF points. */
export const A4 = { w: 595.28, h: 841.89 }

const enc = new TextEncoder()

/** PDF text string; UTF-16BE hex so diacritics survive. */
export function pdfString(s: string): string {
  let hex = 'FEFF'
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase()
  return `<${hex}>`
}

export function buildPdf(pages: PdfPage[], meta: { title?: string, page?: { w: number, h: number } } = {}): Uint8Array<ArrayBuffer> {
  const size = meta.page ?? A4
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part
    chunks.push(bytes)
    length += bytes.length
  }
  const obj = (id: number, body: string | (() => void)) => {
    offsets[id] = length
    push(`${id} 0 obj\n`)
    if (typeof body === 'string') push(body)
    else body()
    push('\nendobj\n')
  }

  // object ids: 1 catalog, 2 pages, 3 info, then 3 per page (page, image, contents)
  const pageId = (i: number) => 4 + i * 3
  push('%PDF-1.4\n%âãÏÓ\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  obj(3, `<< /Producer (BudBuddy)${meta.title ? ` /Title ${pdfString(meta.title)}` : ''} >>`)
  pages.forEach((p, i) => {
    const id = pageId(i)
    const content = `q ${size.w.toFixed(2)} 0 0 ${size.h.toFixed(2)} 0 0 cm /Im0 Do Q`
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size.w.toFixed(2)} ${size.h.toFixed(2)}] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`)
    obj(id + 1, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`)
      push(p.jpeg)
      push('\nendstream')
    })
    obj(id + 2, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  const count = 4 + pages.length * 3
  const xref = length
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`
  for (let id = 1; id < count; id++) table += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`
  push(table)
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}
