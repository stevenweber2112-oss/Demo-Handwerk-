# Angebotsassistent für Tischler-/Schreinerbetriebe (Demo)

Eine kleine, schnelle Web-App, die aus den Eckdaten einer Kundenanfrage
(z. B. „Einbauschrank nach Maß“) automatisch ein **vollständiges, strukturiertes
Angebot** mit Einzelpositionen, Mengen, Preisen und Summen erzeugt – fertig zum
Vorführen beim Kundentermin.

> **Demo-Hinweis:** Die Preise stammen aus **fest hinterlegten Beispielwerten**
> (realistische deutsche Marktpreise, Stand 2025). Es wird **kein** externer
> KI-Dienst aufgerufen. Die Kalkulation ist aber sauber gekapselt und lässt sich
> später durch eine echte Preisliste oder einen KI-Call (Anthropic API) ersetzen
> (siehe unten).

---

## Schnellstart

Voraussetzung: **Node.js 18+** (getestet mit Node 22).

```bash
npm install
npm run dev
```

Danach die angezeigte Adresse im Browser öffnen (Standard:
`http://localhost:5173`).

Weitere Befehle:

| Befehl            | Wirkung                                              |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Startet den Entwicklungsserver (Hot-Reload)          |
| `npm run build`   | Baut die optimierte Produktionsversion nach `dist/`  |
| `npm run preview` | Zeigt den Produktions-Build lokal an                 |

---

## In 10 Sekunden vorführen

1. App starten (`npm run dev`) und im Browser öffnen.
2. Auf **„Beispiel laden“** klicken – das Formular füllt sich mit einem
   realistischen Einbauschrank-Fall (2,50 × 2,40 × 0,60 m, Eiche furniert,
   lackiert, gehobene Beschläge, inkl. Montage).
3. Auf **„Angebot erstellen“** klicken. Nach einer kurzen Lade-Animation
   erscheint das fertige, gegliederte Angebot mit Summen und Konditionen.
4. Mit **„Als PDF drucken“** kann das Angebot direkt als PDF gespeichert /
   gedruckt werden (Bedien-Elemente werden dabei automatisch ausgeblendet).
5. **„Neues Angebot“** setzt zurück.

---

## Projektstruktur

```
src/
├── lib/
│   └── calculation.ts     ← KERNSTÜCK: gesamte Preislogik (UI-frei)
├── components/
│   ├── QuoteForm.tsx       ← Eingabeformular + Validierung + „Beispiel laden“
│   └── QuoteDocument.tsx   ← Darstellung des fertigen Angebots + PDF-Druck
├── App.tsx                 ← verbindet Formular & Angebot, Lade-Animation
├── main.tsx                ← Einstiegspunkt
└── index.css               ← Tailwind + Druck-/PDF-Styles
```

**Architektur-Idee:** Die Kalkulation (`src/lib/calculation.ts`) ist strikt von
der Oberfläche getrennt. Die UI ruft nur die eine Funktion
`generateQuote(input)` auf und bekommt ein fertiges `Quote`-Objekt zurück. So
kann die Preislogik unabhängig angepasst – oder komplett ausgetauscht – werden,
ohne die React-Komponenten anzufassen.

---

## Preise anpassen

Alles Preisrelevante steht zentral in **`src/lib/calculation.ts`**, im klar
markierten **Abschnitt 3 „PREIS-KONSTANTEN“**. Dort findest du u. a.:

| Konstante                  | Bedeutung                                            |
| -------------------------- | ---------------------------------------------------- |
| `STUNDENSATZ`              | Stundensatz der Werkstatt (€/h)                      |
| `MWST_SATZ`                | Mehrwertsteuersatz (Standard 19 %)                   |
| `VERSCHNITT_AUFSCHLAG`     | Verschnitt-/Zuschnittaufschlag auf Material          |
| `MATERIAL_PREIS_PRO_M2`    | Materialpreis je Holzart (€/m²)                      |
| `OBERFLAECHE_PREIS_PRO_M2` | Aufschlag je Oberflächenbehandlung (€/m²)            |
| `BESCHLAEGE_PREIS_PRO_STK` | Beschläge-Stückpreis je Qualitätsstufe               |
| `ANFAHRT_PAUSCHALE` / `…PRO_KM` | Anfahrtspauschale und Kilometersatz             |
| `ARBEITSZEIT_BASIS`        | Basis-Arbeitsstunden je Projekttyp                   |

Die **Mengenberechnung** (wie aus Breite/Höhe/Tiefe die Material- und
Oberflächenflächen entstehen) steht direkt darunter in **Abschnitt 4
„GEOMETRIE / MENGEN-BERECHNUNG“** – je Projekttyp eine eigene, kommentierte
Formel. Die Datei ist durchgängig kommentiert, sodass sich Werte und Formeln
ohne Frontend-Kenntnisse anpassen lassen.

> Einfach die Zahl ändern und speichern – dank Hot-Reload ist die Änderung
> sofort im Browser sichtbar.

---

## Später einen echten KI-Call (Anthropic API) einbauen

Die Stelle zum Andocken ist in `calculation.ts` mit
`// TODO: später durch echte Preisliste/API ersetzen` markiert. Es genügt,
**`generateQuote` auszutauschen** (auf `async` umstellen) und im einzigen
Aufrufer (`src/App.tsx`, ebenfalls mit `TODO` markiert) `await` zu verwenden.

**Wichtige Architektur-Entscheidung zuerst:** Diese Demo ist ein **reines
Frontend ohne Backend**. Ein API-Schlüssel darf **niemals** ins Frontend, weil
er dort für jeden im Browser sichtbar wäre. Für den echten Einsatz daher einen
**kleinen Backend-Proxy** (z. B. eine Serverless-Funktion) vorschalten, der den
Schlüssel hält und die Anfrage an Anthropic weiterreicht. Das Frontend ruft dann
nur diesen eigenen Endpunkt auf.

### Variante A (empfohlen): kleiner Backend-Proxy

Eine schlanke Serverless-Funktion (Vercel, Netlify, Cloudflare Workers, …) oder
ein kleiner Express-Server hält den Schlüssel und ruft die Anthropic-API auf:

```ts
// server/quote.ts  (läuft auf dem Server, NICHT im Browser)
import Anthropic from '@anthropic-ai/sdk' // npm i @anthropic-ai/sdk

const client = new Anthropic() // liest ANTHROPIC_API_KEY aus der Umgebung

export async function handler(req, res) {
  const input = req.body // = QuoteInput aus dem Formular

  const message = await client.messages.create({
    // Aktuelles Modell siehe https://platform.claude.com/docs/en/about-claude/models
    // (z. B. ein aktuelles Sonnet-Modell – schnell & günstig für strukturierte
    //  Ausgaben; ein Opus-Modell für maximale Qualität).
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system:
      'Du bist ein Kalkulations-Assistent für deutsche Tischlerbetriebe. ' +
      'Erstelle aus den Eingaben ein realistisches Angebot und gib es als ' +
      'JSON exakt im vorgegebenen Schema zurück.',
    messages: [{ role: 'user', content: JSON.stringify(input) }],
    // Erzwingt eine valide, zum Quote-Typ passende JSON-Antwort:
    output_config: { format: { type: 'json_schema', schema: QUOTE_SCHEMA } },
  })

  const text = message.content.find((b) => b.type === 'text')?.text ?? '{}'
  res.json(JSON.parse(text)) // = Quote
}
```

Im Frontend wird `generateQuote` dann zu einem einfachen `fetch`:

```ts
export async function generateQuote(input: QuoteInput): Promise<Quote> {
  const res = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return res.json()
}
```

### Variante B (nur für lokale Tests): direkt aus dem Browser

Schnell, aber **der Schlüssel ist sichtbar** – nur für Experimente am eigenen
Rechner, nie für eine echte/öffentliche Demo:

```ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, // ⚠️ im Browser sichtbar!
  dangerouslyAllowBrowser: true,
})
```

> In beiden Varianten bleibt die Signatur `QuoteInput → Quote` erhalten – die
> gesamte Oberfläche funktioniert unverändert weiter. Tipp: Die lokale
> `generateQuote`-Kalkulation als Fallback behalten, falls der API-Call
> fehlschlägt.

Das offizielle SDK heißt `@anthropic-ai/sdk`. Aktuelle Modell-IDs und Details:
<https://platform.claude.com/docs>.

---

## Tech-Stack

- **React 18 + TypeScript**, gebaut mit **Vite**
- **Tailwind CSS** für das Styling
- **Kein Backend, keine Datenbank, kein localStorage** – der Zustand lebt nur im
  Speicher (React `useState`)

## Bewusste Nicht-Ziele dieser Version

- Keine echte API-Anbindung (kommt später – siehe oben)
- Keine Nutzerverwaltung, kein Login, keine Datenspeicherung
- Kein Backend

---

*Alle Firmenangaben („Tischlerei Mustermann“) sind Platzhalter und können in
`src/components/QuoteDocument.tsx` (Objekt `FIRMA`) angepasst werden.*
