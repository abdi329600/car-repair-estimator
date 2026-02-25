import { kv } from "@vercel/kv";

const hasKV =
  !!process.env.KV_REST_API_URL &&
  !!process.env.KV_REST_API_TOKEN;

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  if (!hasKV) return null;

  try {
    const value = await kv.get<T>(key);
    return value ?? null;
  } catch (err) {
    console.error("[kv] get failed:", err);
    return null;
  }
}

export async function kvSetJSON(
  key: string,
  value: unknown,
  ttlSeconds: number
) {
  if (!hasKV) return;

  try {
    await kv.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error("[kv] set failed:", err);
  }
}
