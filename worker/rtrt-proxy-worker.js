/**
 * RTRT.me Proxy – Cloudflare Worker
 * --------------------------------------------------------------
 * Zweck: Holt Live-Splits eines Athleten von api.rtrt.me und gibt sie
 *        CORS-fähig an den Race-Tracker zurück. Die appid bleibt im Worker.
 *
 * Aufruf vom Tracker:
 *   https://DEIN-WORKER.workers.dev/?event=IM-AUSTRIA-2026&bib=1234
 *   https://DEIN-WORKER.workers.dev/?event=IM-AUSTRIA-2026&pid=R2KRY3TV   (zuverlässiger)
 *   https://DEIN-WORKER.workers.dev/?event=IM-AUSTRIA-2025&points=1        (Durchgangspunkte/Matten)
 *
 * Antwort: { "pid": "...", "splits": <RTRT-JSON> }  oder  { "error": "..." }
 *
 * Deploy (zwei Wege):
 *  A) dash.cloudflare.com → Workers & Pages → Create Worker → Code einfügen → Deploy
 *  B) lokal mit wrangler:  npm i -g wrangler && wrangler deploy
 *
 * WICHTIG: APPID unten eintragen. Die appid liest du aus dem offiziellen
 * IRONMAN-Web-Tracker (siehe README, Schritt "appid & event finden").
 */

const APPID = "52139b797871851e0800638e"; // RTRT.me appid (IRONMAN-Tracker)
const ALLOW_ORIGIN = "*";            // optional: auf deine Domain einschränken, z. B. "https://patrick.pages.dev"

let TOKEN = null;
let TOKEN_TS = 0;

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const url = new URL(request.url);
    const event = url.searchParams.get("event");
    const pid = url.searchParams.get("pid");
    const bib = url.searchParams.get("bib");
    const points = url.searchParams.get("points"); // Point-Definitionen des Events (PID-frei)

    if (APPID === "PUT_YOUR_APPID_HERE") return cors(json({ error: "APPID im Worker nicht gesetzt" }, 500));
    if (!event) return cors(json({ error: "event erforderlich" }, 400));
    if (!points && !pid && !bib) return cors(json({ error: "event und pid oder bib erforderlich (oder points=1)" }, 400));

    try {
      const token = await getToken();

      // Offizielle Durchgangspunkte/Matten des Events (z. B. zum Mappen aus dem Vorjahr)
      if (points) {
        const ptUrl = `https://api.rtrt.me/events/${enc(event)}/points?appid=${APPID}&token=${token}&max=500`;
        const pr = await fetch(ptUrl, { cf: { cacheTtl: 0 } });
        const pj = await pr.json().catch(() => ({}));
        return cors(json({ event, points: pj }));
      }

      let targetPid = pid;

      // Bib -> PID auflösen (best effort; PID direkt ist zuverlässiger)
      if (!targetPid && bib) {
        const sUrl = `https://api.rtrt.me/events/${enc(event)}/profiles?appid=${APPID}&token=${token}&max=10&search=${enc(bib)}`;
        const sr = await fetch(sUrl, { cf: { cacheTtl: 0 } });
        const sj = await sr.json().catch(() => ({}));
        const list = sj.list || (sj.data && sj.data.list) || [];
        const match = list.find(p => String(p.bib) === String(bib)) || list[0];
        if (match) targetPid = match.pid || match.id;
      }
      if (!targetPid) return cors(json({ error: "Athlet nicht gefunden", bib }, 404));

      const splUrl = `https://api.rtrt.me/events/${enc(event)}/profiles/${enc(targetPid)}/splits?appid=${APPID}&token=${token}&max=200`;
      const pr = await fetch(splUrl, { cf: { cacheTtl: 0 } });
      const pj = await pr.json().catch(() => ({}));
      return cors(json({ pid: targetPid, splits: pj }));
    } catch (e) {
      return cors(json({ error: String(e && e.message || e) }, 500));
    }
  }
};

async function getToken() {
  const now = Date.now();
  if (TOKEN && now - TOKEN_TS < 6 * 3600 * 1000) return TOKEN; // 6 h cachen
  const r = await fetch(`https://api.rtrt.me/register?appid=${APPID}`);
  const j = await r.json().catch(() => null);
  TOKEN = (j && (j.token || (j.data && j.data.token))) || (typeof j === "string" ? j : null);
  if (!TOKEN) throw new Error("Token-Registrierung fehlgeschlagen");
  TOKEN_TS = now;
  return TOKEN;
}

function cors(resp) {
  const r = new Response(resp.body, resp);
  r.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  r.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "*");
  r.headers.set("Cache-Control", "no-store");
  return r;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
function enc(s) { return encodeURIComponent(s); }
