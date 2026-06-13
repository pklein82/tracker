# Ironman Austria – Race Tracker

Ein leichtgewichtiger Race-Tracker für eine Athletin/einen Athleten beim **IRONMAN Kärnten-Klagenfurt** (14.06.2026). Zeigt Soll-Zeitplan, Live-Status, die echte Strecke auf einer Karte und – optional – automatisch abgerufene Zwischenzeiten aus dem offiziellen Timing-Feed (RTRT.me).

➡️ **Live (GitHub Pages):** `https://pklein82.github.io/tracker/`

## Features

- **Soll-Zeitplan** aus den geplanten Splits (Schwimmen / T1 / Rad / T2 / Laufen), Start frei einstellbar.
- **Live-Status**: zeigt, wo die Person laut Plan gerade sein müsste (Disziplin, ~km, Fortschritt).
- **Zeitmessungspunkte** an den echten Rundenmatten (2 Radrunden ~90 km, 2 Laufrunden ~21,1 km). Tatsächliche Durchgangszeiten per Tap eintragbar; Abweichung zum Plan in +/− Minuten.
- **Karte** mit der echten Strecke (Leaflet + OpenStreetMap), Disziplinen ein-/ausblendbar, plus GPX-Overlay.
- **Automatischer Abruf (optional)** der offiziellen Splits via RTRT.me über einen kleinen Cloudflare-Worker (CORS-Proxy). Manuelle Eingaben haben immer Vorrang.

## Struktur

```
index.html                     # der Tracker (eine Datei, keine Build-Schritte)
worker/rtrt-proxy-worker.js    # Cloudflare Worker als RTRT.me-Proxy
```

## GitHub Pages aktivieren

1. Repo-Settings → **Pages** → Source: `Deploy from a branch` → Branch `main`, Ordner `/ (root)` → Save.
2. Nach ein paar Minuten ist die Seite unter `https://pklein82.github.io/tracker/` erreichbar.

> Hinweis zur Speicherung: Auf GitHub Pages persistiert der Tracker manuelle Einträge nicht über das Neuladen hinaus (kein `window.storage` außerhalb der Claude-Umgebung). Der Live-Abruf funktioniert trotzdem, da die Daten bei jedem Laden frisch geholt werden. Wer auch externe Persistenz braucht, kann `window.storage` durch `localStorage` ersetzen.

## Automatischer Abruf einrichten (optional)

Die offiziellen Zwischenzeiten laufen über **RTRT.me**. Der Worker hält die `appid` versteckt und löst CORS.

**1. `appid` und Event-Slug finden** (am Renntag, sobald das Event live ist):
- Offiziellen IRONMAN-Web-Tracker in Desktop-Chrome öffnen, Athlet:in suchen.
- `F12` → **Network** → Filter `rtrt` → ein Request an `api.rtrt.me` anklicken.
- In der URL ablesen: `?appid=…` (die appid) und `…/events/EVENT-SLUG/profiles/…` (der Event-Slug).
- Die **PID** steht ebenfalls dort (`…/profiles/PID/splits`) – zuverlässiger als die Startnummer.

**2. Worker deployen:**
- In `worker/rtrt-proxy-worker.js` oben `APPID` eintragen.
- Dashboard: dash.cloudflare.com → *Workers & Pages* → *Create Worker* → Code einfügen → *Deploy*.
  Oder CLI: `npm i -g wrangler && wrangler deploy`.
- Test: `https://DEIN-WORKER.workers.dev/?event=EVENT-SLUG&pid=PID` → JSON mit `splits`.

**3. Im Tracker eintragen:** Bereich *Automatischer Abruf · RTRT.me* → Worker-URL, Event-Slug, Startnummer/PID, Häkchen „Live-Abruf aktiv" → Speichern. Abruf alle 60 s.

> Feld-/Punktnamen von RTRT.me können je Event leicht abweichen. Falls Live-Splits erscheinen, aber eine Zeit „—" zeigt oder ein Punkt nicht gemappt wird, muss `toHM()` bzw. das Mapping in `index.html` minimal angepasst werden.

## Hinweise / Lizenz

- Die Streckendaten der Karte sind aus GPX-Tracks früherer IM-Austria-Strecken übernommen und im `index.html` als reine Koordinaten eingebettet (ohne Namen/Metadaten). Original-GPX-Dateien sind via `.gitignore` aus dem Repo ausgeschlossen.
- Kartendarstellung: [Leaflet](https://leafletjs.com/), Kacheln © OpenStreetMap-Mitwirkende.
- Live-Timing: [RTRT.me](https://rtrt.me) – Nutzung im Rahmen ihrer Acceptable-Use-Bedingungen.
- Nicht offiziell mit IRONMAN / RTRT.me verbunden.
