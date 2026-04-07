import { getStore } from "@netlify/blobs";

const STORE_NAME = "finance-tracker";
const KEY = "transactions";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    const raw = await store.get(KEY);
    if (!raw) return jsonResponse(200, []);
    try {
      const parsed = JSON.parse(raw);
      return jsonResponse(200, Array.isArray(parsed) ? parsed : []);
    } catch {
      return jsonResponse(200, []);
    }
  }

  if (req.method === "POST") {
    let data = [];
    try {
      const body = await req.json();
      data = Array.isArray(body) ? body : [];
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON" });
    }

    await store.set(KEY, JSON.stringify(data));
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(405, { ok: false, error: "Method Not Allowed" });
};
