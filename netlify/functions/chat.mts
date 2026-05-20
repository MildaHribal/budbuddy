// Netlify serverless proxy for the BudBuddy AI assistant.
//
// The Gemini API key lives ONLY here, as the `GEMINI_API_KEY` environment
// variable set in the Netlify dashboard (Site settings → Environment
// variables). It is never shipped in the app bundle or committed to git, so
// it can't be scraped or auto-revoked. The app calls this endpoint instead of
// calling Gemini directly, so users don't have to configure anything.

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM_PROMPT = `You are BudBuddy, a friendly and highly knowledgeable cannabis cultivation assistant inside a grow-tracking app.
Help home growers with germination, seedling, vegetative and flowering care, nutrients and pH, lighting, watering, ventilation, training (LST/topping), pest and deficiency diagnosis, harvesting, drying and curing.
Guidelines:
- Give practical, specific, actionable advice. Use short paragraphs and bullet points.
- Use occasional plant emoji (🌱🌿💧) to stay friendly, but don't overdo it.
- When a photo is provided, describe what you see and give a likely diagnosis with next steps.
- Always remind users to follow the cannabis laws of their own country/region.
- Reply in the same language the user writes in.
Keep answers focused and concise.`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return Response.json({ error: 'AI is not configured on the server.' }, { status: 503, headers: CORS })
  }

  let contents: unknown
  try {
    const body = await req.json()
    contents = body?.contents
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400, headers: CORS })
  }

  if (!Array.isArray(contents) || contents.length === 0) {
    return Response.json({ error: 'Missing conversation contents.' }, { status: 400, headers: CORS })
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    })

    const data = await res.json()

    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || `Gemini error ${res.status}` },
        { status: 502, headers: CORS }
      )
    }

    const text: string = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join('')
      .trim()

    if (!text) {
      const blocked = data?.promptFeedback?.blockReason
      return Response.json(
        { text: blocked ? '⚠️ I couldn\'t answer that one. Try rephrasing your grow question.' : '' },
        { headers: CORS }
      )
    }

    return Response.json({ text }, { headers: CORS })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Upstream request failed.' },
      { status: 502, headers: CORS }
    )
  }
}

export const config = { path: '/api/chat' }
