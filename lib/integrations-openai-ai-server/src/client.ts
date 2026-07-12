import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY muhit o'zgaruvchisi sozlanmagan.");
  }
  _client = new OpenAI({ apiKey: key });
  return _client;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getClient();
    const val = (client as any)[prop];
    if (typeof val === "function") return val.bind(client);
    return val;
  },
});
