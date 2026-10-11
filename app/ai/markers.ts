// Machine-readable markers the model may append: <<reply: a | b | c>> and <<photo>>.

export interface ParsedAnswer {
  text: string
  replies: string[]
  photo: boolean
}

const REPLY = /<<\s*reply\s*:([\s\S]*?)>>/gi
const PHOTO = /<<\s*photo\s*>>/gi
const MAX_REPLIES = 4
const MAX_REPLY_LENGTH = 60

/** Strips markers from the visible text; also hides a marker that is still streaming in. */
export function parseAnswer(raw: string): ParsedAnswer {
  const replies: string[] = []
  let photo = false
  let text = raw.replace(REPLY, (_, list: string) => {
    for (const r of list.split('|')) {
      const reply = r.trim()
      if (reply && reply.length <= MAX_REPLY_LENGTH && replies.length < MAX_REPLIES && !replies.includes(reply)) replies.push(reply)
    }
    return ''
  })
  text = text.replace(PHOTO, () => {
    photo = true
    return ''
  })
  const open = text.lastIndexOf('<<')
  if (open !== -1 && !text.includes('>>', open)) text = text.slice(0, open)
  else if (text.endsWith('<')) text = text.slice(0, -1)
  return { text: text.replace(/[ \t]+$/gm, '').trimEnd(), replies, photo }
}
