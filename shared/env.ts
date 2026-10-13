// Server env on Netlify (Node) and Supabase Edge Functions (Deno).
export function env(name: string): string | undefined {
  const deno = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno
  return deno ? deno.env.get(name) : process.env[name]
}
