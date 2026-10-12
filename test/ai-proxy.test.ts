import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { locale } from '../app/utils/locale'
import { applyChunk, finishAnswer, parseSse, proxyError, quotaResetLabel, toGeminiContents } from '../app/ai/providers/proxy'
import { loadNamespaces } from '../app/composables/useI18n'

// the ai namespace loads with its route in the app
beforeAll(() => loadNamespaces(['ai']))

describe('proxy provider', () => {
  beforeEach(() => {
    locale.value = 'cs'
  })

  it('parses server-sent events across chunk boundaries', () => {
    const first = parseSse('data: {"a":1}\n\ndata: {"b"')
    expect(first.events).toEqual(['{"a":1}'])
    const second = parseSse(`${first.rest}:2}\r\n\r\n`)
    expect(second.events).toEqual(['{"b":2}'])
    expect(second.rest).toBe('')
  })

  it('collects text but skips thoughts', () => {
    const answer = { text: '' }
    applyChunk(answer, { candidates: [{ content: { parts: [{ text: 'hmm', thought: true }, { text: 'Ahoj' }] } }], modelVersion: 'gemini-3.8-flash' })
    applyChunk(answer, { candidates: [{ content: { parts: [{ text: ' světe' }] }, finishReason: 'STOP' }] })
    expect(finishAnswer(answer)).toEqual({ text: 'Ahoj světe', modelVersion: 'gemini-3.8-flash' })
    expect(() => applyChunk(answer, { promptFeedback: { blockReason: 'SAFETY' } })).toThrow(/filtr/)
  })

  it('keeps a partial answer cut by the server deadline', () => {
    const answer = { text: '' }
    applyChunk(answer, { candidates: [{ content: { parts: [{ text: 'Část' }] } }] })
    applyChunk(answer, { budbuddy: { error: 'timeout' } })
    expect(finishAnswer(answer).text).toContain('časový limit serveru')
    expect(() => finishAnswer({ text: '', cutOff: 'timeout' } as never)).toThrow(/60 s/)
  })

  it('maps the conversation and puts the image first', () => {
    expect(toGeminiContents([{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }], 'otázka', { mimeType: 'image/jpeg', base64: 'AAA' })).toEqual([
      { role: 'user', parts: [{ text: 'a' }] },
      { role: 'model', parts: [{ text: 'b' }] },
      { role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'AAA' } }, { text: 'otázka' }] }
    ])
  })

  it('explains server errors in Czech', () => {
    expect(proxyError(503, { error: { reason: 'not_configured' } }, 'm').message).toContain('není nastavený')
    const quota = proxyError(429, { error: { reason: 'quota', retryAfterSec: 37 } }, 'm')
    expect(quota.code).toBe('quota')
    expect(quota.message).toContain('37 s')
    expect(proxyError(429, null, 'm').code).toBe('rate-limit')
    expect(proxyError(404, null, 'm').message).toContain('/api/chat')
    expect(proxyError(502, { error: { reason: 'model' } }, 'gemini-x').message).toContain('gemini-x')
  })

  it('explains the daily free quota with the local reset time', () => {
    const daily = proxyError(429, { error: { reason: 'quota', daily: true, limit: 20 } }, 'm')
    expect(daily.code).toBe('quota')
    expect(daily.message).toMatch(/^Denní limit AI \(20 dotazů\) je vyčerpaný, obnoví se (dnes|zítra) kolem \d{1,2}:00\.$/)
    // 07:00 UTC is 00:00 PDT -> the reset is 24 h later; 06:00 UTC is 23:00 PDT -> one hour later
    const tz = (d: Date) => `${String(d.getHours())}:00`
    expect(quotaResetLabel(new Date(Date.UTC(2026, 9, 11, 6, 0)))).toContain(tz(new Date(Date.UTC(2026, 9, 11, 7, 0))))
  })

  it('turns a late in-stream quota error into the daily-limit message', () => {
    expect(() => applyChunk({ text: '' }, { budbuddy: { error: { reason: 'quota', message: '', daily: true, limit: 20 } } })).toThrow(/Denní limit AI \(20 dotazů\)/)
  })

  it('shows why an answer came back empty', () => {
    expect(() => finishAnswer({ text: '', finishReason: 'MALFORMED_FUNCTION_CALL' } as never)).toThrow(/MALFORMED_FUNCTION_CALL/)
  })

  it('explains server errors in English', () => {
    locale.value = 'en'
    expect(proxyError(503, { error: { reason: 'not_configured' } }, 'm').message).toContain('not set up')
    expect(proxyError(429, { error: { reason: 'quota', retryAfterSec: 37 } }, 'm').message).toContain('Next try in 37 s')
    expect(finishAnswer({ text: 'x', cutOff: 'timeout' } as never).text).toContain('server time limit')
  })
})
