import { describe, expect, it } from 'vitest'
import { parseAnswer } from '../app/ai/markers'

describe('parseAnswer', () => {
  it('extracts suggested replies and the photo request', () => {
    const r = parseAnswer('Nejspíš dusík, nebo pH.\n- Jen špičky?\n<<photo>>\n<<reply: jen špičky | celé listy | staré dole | nové nahoře | navíc>>')
    expect(r).toEqual({ text: 'Nejspíš dusík, nebo pH.\n- Jen špičky?', replies: ['jen špičky', 'celé listy', 'staré dole', 'nové nahoře'], photo: true })
  })

  it('hides a marker that is still streaming in', () => {
    expect(parseAnswer('Otázka?\n<<rep').text).toBe('Otázka?')
    expect(parseAnswer('Otázka?\n<<reply: jen špičky | cel').text).toBe('Otázka?')
    expect(parseAnswer('Otázka?\n<').text).toBe('Otázka?')
    expect(parseAnswer('a < b').text).toBe('a < b')
  })

  it('allows > inside a reply', () => {
    expect(parseAnswer('Otázka?\n<<reply: nízké pH | vysoké pH (>7)>>')).toEqual({ text: 'Otázka?', replies: ['nízké pH', 'vysoké pH (>7)'], photo: false })
  })

  it('leaves ordinary text alone', () => {
    expect(parseAnswer('pH 6,2–6,8 [1].')).toEqual({ text: 'pH 6,2–6,8 [1].', replies: [], photo: false })
  })
})
