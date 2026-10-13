import { describe, expect, it } from 'vitest'
import { parseVoiceLog, type VoicePlant } from '../app/utils/voiceParse'

const plants: VoicePlant[] = [
  { id: 'g', name: 'Gelato' },
  { id: 'nl1', name: 'Northern Lights #1' },
  { id: 'nl2', name: 'Northern Lights #2' },
  { id: 'ak', name: 'Auto AK' }
]
const cs = (text: string) => parseVoiceLog(text, { plants, lang: 'cs' })
const en = (text: string) => parseVoiceLog(text, { plants, lang: 'en' })

describe('voice parser – Czech', () => {
  it('watering with pH and EC (decimal commas)', () => {
    const d = cs('zalil jsem 2 litry pH 6,2 EC 1,4')
    expect(d).toMatchObject({ type: 'water', amountMl: 2000, ph: 6.2, ec: 1.4, nutrients: '', plantId: null })
  })

  it('decimal litres and millilitres', () => {
    expect(cs('zalito 1,5 l').amountMl).toBe(1500)
    expect(cs('zalila jsem 750 ml').amountMl).toBe(750)
    expect(cs('zalito 0,75 litru').amountMl).toBe(750)
    expect(cs('zálivka 500 mililitrů').amountMl).toBe(500)
  })

  it('spoken numbers', () => {
    expect(cs('zalito dva litry, pH šest celá tři, EC jedna celá čtyři')).toMatchObject({ amountMl: 2000, ph: 6.3, ec: 1.4 })
    expect(cs('zalil jsem dva a půl litru').amountMl).toBe(2500)
    expect(cs('zalil jsem půl litru').amountMl).toBe(500)
    expect(cs('zalil jsem litr a půl').amountMl).toBe(1500)
    expect(cs('zalil jsem litr vody').amountMl).toBe(1000)
    expect(cs('zalito dvě stě padesát mililitrů').amountMl).toBe(250)
    expect(cs('zalito 1 a půl litru').amountMl).toBe(1500)
  })

  it('nutrient after the dose', () => {
    const d = cs('přidal jsem 3 ml Bio Grow')
    expect(d.type).toBe('feed')
    expect(d.nutrients).toBe('Bio Grow 3 ml')
    expect(d.amountMl).toBeNull()
  })

  it('nutrient before the dose and per-litre doses', () => {
    expect(cs('přidal jsem Bio Grow 3 ml').nutrients).toBe('Bio Grow 3 ml')
    expect(cs('pohnojil jsem 2 ml na litr CalMag').nutrients).toBe('CalMag 2 ml/L')
    expect(cs('hnojení 2 ml/l Grow a 1 ml/l Bloom').nutrients).toBe('Grow 2 ml/L, Bloom 1 ml/L')
  })

  it('feeding with water amount, nutrients and plant', () => {
    const d = cs('pohnojil jsem Gelato, 2 litry s 4 ml Bio Grow, pH 6,3')
    expect(d).toMatchObject({ type: 'feed', plantId: 'g', amountMl: 2000, ph: 6.3 })
    expect(d.nutrients).toBe('Bio Grow 4 ml')
  })

  it('half millilitre doses keep the decimal comma', () => {
    expect(cs('přidal jsem 1,5 ml CalMag').nutrients).toBe('CalMag 1,5 ml')
  })

  it('plant names with Czech endings', () => {
    expect(cs('zalil jsem Gelata').plantId).toBe('g')
    expect(cs('Gelatu jsem dal 1 litr').plantId).toBe('g')
    expect(cs('zalil jsem auto AK').plantId).toBe('ak')
  })

  it('numbered plants need the number; without it the match is ambiguous', () => {
    expect(cs('zalil jsem Northern Lights 2 litr').plantId).toBe('nl2')
    expect(cs('zalil jsem Northern Lights jedna').plantId).toBe('nl1')
    expect(cs('zalil jsem Northern Lights').plantId).toBeNull()
  })

  it('a plant number never eats the water amount', () => {
    const d = cs('zalil jsem Gelato 1 litr')
    expect(d).toMatchObject({ plantId: 'g', amountMl: 1000 })
  })

  it('measurements', () => {
    const d = cs('výška 45 cm, teplota 24 stupňů, vlhkost 55 %')
    expect(d).toMatchObject({ type: 'measure', heightCm: 45, tempC: 24, humidity: 55 })
    expect(cs('změřil jsem pH 6,5')).toMatchObject({ type: 'measure', ph: 6.5 })
    expect(cs('teplota je 23,5 °C a vlhkost 60 procent')).toMatchObject({ tempC: 23.5, humidity: 60 })
    expect(cs('výška 1,2 metru').heightCm).toBe(120)
  })

  it('EC in microsiemens', () => {
    expect(cs('EC 1400 mikrosiemens').ec).toBe(1.4)
    expect(cs('EC 1400').ec).toBe(1.4)
    expect(cs('EC 1,8 mS').ec).toBe(1.8)
  })

  it('out-of-range pH is ignored', () => {
    expect(cs('pH 62').ph).toBeNull()
  })

  it('training methods', () => {
    expect(cs('zaštípnul jsem Gelato')).toMatchObject({ type: 'train', method: 'topping', plantId: 'g' })
    expect(cs('ohnul jsem hlavní stonek')).toMatchObject({ type: 'train', method: 'lst' })
    expect(cs('defoliace')).toMatchObject({ type: 'train', method: 'defoliation' })
    expect(cs('přesadil jsem do 11 litrů')).toMatchObject({ type: 'train', method: 'transplant' })
  })

  it('pest treatment with product', () => {
    const d = cs('postřik proti sviluškám přípravkem Spruzit')
    expect(d.type).toBe('pest')
    expect(d.product).toBe('Spruzit')
    expect(d.note).toContain('sviluškám')
    expect(cs('postříkal jsem neemem').product).toBe('Neem')
  })

  it('notes and dates', () => {
    expect(cs('poznámka: první květy')).toMatchObject({ type: 'note', note: 'První květy' })
    expect(cs('včera jsem zalil 1 litr')).toMatchObject({ type: 'water', dayOffset: -1, amountMl: 1000 })
    expect(cs('předevčírem zalito').dayOffset).toBe(-2)
  })

  it('empty input is a blank note', () => {
    expect(cs('')).toMatchObject({ type: 'note', note: '' })
  })
})

describe('voice parser – English', () => {
  it('watered 1.5 L', () => {
    expect(en('watered 1.5 L')).toMatchObject({ type: 'water', amountMl: 1500 })
    expect(en('watered 1,5 l')).toMatchObject({ amountMl: 1500 })
  })

  it('spoken numbers', () => {
    expect(en('watered one and a half liters')).toMatchObject({ amountMl: 1500 })
    expect(en('watered half a liter').amountMl).toBe(500)
    expect(en('watered a litre and a half').amountMl).toBe(1500)
    expect(en('pH six point two, EC one point four')).toMatchObject({ ph: 6.2, ec: 1.4 })
    expect(en('ec one point two five').ec).toBe(1.25)
    expect(en('watered two hundred fifty ml').amountMl).toBe(250)
  })

  it('feeding with nutrients', () => {
    const d = en('fed Gelato 2 litres with 2 ml per liter of Grow and 1 ml/L CalMag, pH 6.1')
    expect(d).toMatchObject({ type: 'feed', plantId: 'g', amountMl: 2000, ph: 6.1 })
    expect(d.nutrients).toBe('Grow 2 ml/L, CalMag 1 ml/L')
    expect(en('added Bio Grow 3 ml').nutrients).toBe('Bio Grow 3 ml')
  })

  it('measurements', () => {
    expect(en('height 60 cm temperature 25 degrees humidity 50%')).toMatchObject({ type: 'measure', heightCm: 60, tempC: 25, humidity: 50 })
    expect(en('temp is 22 °C')).toMatchObject({ tempC: 22 })
  })

  it('training and pests', () => {
    expect(en('topped Gelato')).toMatchObject({ type: 'train', method: 'topping', plantId: 'g' })
    expect(en('did some LST')).toMatchObject({ method: 'lst' })
    expect(en('sprayed with neem oil')).toMatchObject({ type: 'pest', product: 'neem oil' })
  })

  it('yesterday and notes', () => {
    expect(en('yesterday watered 1 liter')).toMatchObject({ dayOffset: -1, amountMl: 1000 })
    expect(en('note first pistils showing')).toMatchObject({ type: 'note', note: 'First pistils showing' })
  })

  it('"ten" is a number only in English', () => {
    expect(en('watered ten liters').amountMl).toBe(10000)
    expect(cs('ten květináč je těžký').amountMl).toBeNull()
  })
})
