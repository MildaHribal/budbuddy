// Minimal PDF writer: one full-page JPEG per page (DCTDecode), no dependencies.

export interface PdfPage {
  /** JPEG bytes */
  jpeg: Uint8Array
  /** pixel size of the image */
  width: number
  height: number
}

const A4 = { w: 595.28, h: 841.89 }

export function buildJpegPdf(pages: PdfPage[]): Blob {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let size = 0
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part
    chunks.push(bytes)
    size += bytes.length
  }
  const obj = (n: number, body: () => void) => {
    offsets[n] = size
    push(`${n} 0 obj\n`)
    body()
    push('\nendobj\n')
  }

  // 1 catalog, 2 pages, then per page: page, image, content
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`))
  pages.forEach((p, i) => {
    const page = 3 + i * 3
    const img = page + 1
    const content = page + 2
    obj(page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`))
    obj(img, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`)
      push(p.jpeg)
      push('\nendstream')
    })
    const draw = `q ${A4.w} 0 0 ${A4.h} 0 0 cm /Im${i} Do Q`
    obj(content, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`))
  })
  const count = 3 + pages.length * 3
  const xref = size
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
}
