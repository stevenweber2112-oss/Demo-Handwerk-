import { useState } from 'react'
import QuoteForm from './components/QuoteForm'
import QuoteDocument from './components/QuoteDocument'
import { generateQuote, type Quote, type QuoteInput } from './lib/calculation'

/**
 * App – die Wurzelkomponente und der "Dirigent" der Demo.
 *
 * Verantwortlich für:
 *   - den globalen Zustand (aktuelles Angebot + Lade-Zustand), nur im Speicher
 *   - das Umschalten zwischen Eingabeformular und fertigem Angebot
 *   - die kurze, künstliche Lade-Animation (~1 s), damit sich die Erzeugung
 *     wie echte Verarbeitung anfühlt
 *
 * Die Kalkulation selbst passiert ausschließlich in `generateQuote`
 * (src/lib/calculation.ts) – die UI weiß nichts über Preise oder Formeln.
 */

/** Dauer der simulierten Verarbeitung in Millisekunden. */
const GENERATION_DELAY_MS = 1000

export default function App() {
  // Das fertige Angebot (oder null, solange noch keins erstellt wurde).
  const [quote, setQuote] = useState<Quote | null>(null)
  // True, während das Angebot "berechnet" wird (für die Lade-Animation).
  const [isGenerating, setIsGenerating] = useState(false)
  // True, während eine Überarbeitung (zweites Angebot) erstellt wird.
  const [isRevising, setIsRevising] = useState(false)

  /**
   * Wird vom Formular mit gültiger Eingabe aufgerufen. Wir simulieren eine
   * kurze Verarbeitung und erzeugen danach das Angebot.
   *
   * // TODO: später durch echte Preisliste/API ersetzen
   * Hier könnte statt setTimeout + generateQuote ein echter (asynchroner)
   * API-Aufruf stehen, z. B. an die Anthropic-API. Siehe README.
   */
  function handleGenerate(input: QuoteInput) {
    setIsGenerating(true)
    window.setTimeout(() => {
      setQuote(generateQuote(input))
      setIsGenerating(false)
      // Nach oben scrollen, damit der Angebotskopf sichtbar ist.
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, GENERATION_DELAY_MS)
  }

  /** Zurück zum (leeren) Formular für ein neues Angebot. */
  function handleReset() {
    setQuote(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Überarbeitung durch den Betrieb: Stunden-Korrektur und Hinweise anwenden
   * und daraus ein überarbeitetes (zweites) Angebot erzeugen – mit gleicher
   * Angebots- und Kundennummer, nur höherer Revisionsnummer.
   */
  function handleRevise(adj: { stundenKorrektur: number; revisionNote: string }) {
    if (!quote) return
    const base = quote
    setIsRevising(true)
    window.setTimeout(() => {
      setQuote(
        generateQuote(base.input, {
          stundenKorrektur: adj.stundenKorrektur,
          revisionNote: adj.revisionNote,
          revision: base.revision + 1,
          quoteNumber: base.quoteNumber,
          customerNumber: base.customerNumber,
        }),
      )
      setIsRevising(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 800)
  }

  return (
    <div className="min-h-screen">
      {/* ---------- App-Kopfleiste (nicht im Druck) ---------- */}
      <header className="no-print print-exact sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              TM
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">
                Angebotsassistent
              </p>
              <p className="text-xs leading-tight text-slate-400">Tischlerei Mustermann</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
            Demo
          </span>
        </div>
      </header>

      {/* ---------- Hauptbereich ---------- */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {quote ? (
          // ----- Ansicht: fertiges Angebot -----
          <QuoteDocument
            quote={quote}
            onReset={handleReset}
            onRevise={handleRevise}
            isRevising={isRevising}
          />
        ) : (
          // ----- Ansicht: Eingabeformular -----
          <div className="relative">
            <div className="no-print mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Angebot in Sekunden erstellen
              </h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Eckdaten der Kundenanfrage eingeben – der Assistent erzeugt daraus ein vollständiges,
                strukturiertes Angebot mit Positionen, Mengen und Preisen. Tipp:{' '}
                <span className="font-medium text-brand-700">„Beispiel laden“</span> füllt das
                Formular mit einem realistischen Fall.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <QuoteForm onGenerate={handleGenerate} isGenerating={isGenerating} />
            </div>

            {/* Lade-Overlay während der "Berechnung" */}
            {isGenerating && <GeneratingOverlay />}
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Halbtransparentes Overlay mit Lade-Animation. Erscheint über dem Formular,
 * solange das Angebot erzeugt wird.
 */
function GeneratingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-lg">
        <div className="flex gap-1.5">
          {/* Drei pulsierende Punkte (Animation in index.css definiert). */}
          <span
            className="h-3 w-3 rounded-full bg-brand-600"
            style={{ animation: 'dot-pulse 1.2s infinite ease-in-out', animationDelay: '0s' }}
          />
          <span
            className="h-3 w-3 rounded-full bg-brand-600"
            style={{ animation: 'dot-pulse 1.2s infinite ease-in-out', animationDelay: '0.2s' }}
          />
          <span
            className="h-3 w-3 rounded-full bg-brand-600"
            style={{ animation: 'dot-pulse 1.2s infinite ease-in-out', animationDelay: '0.4s' }}
          />
        </div>
        <p className="text-sm font-medium text-slate-700">Angebot wird kalkuliert …</p>
      </div>
    </div>
  )
}
