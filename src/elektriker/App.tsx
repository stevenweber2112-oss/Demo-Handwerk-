import { useState } from 'react'
import QuoteForm from './components/QuoteForm'
import QuoteDocument from './components/QuoteDocument'
import { generateQuote, type Quote, type QuoteInput } from './calculation'

/**
 * App (Elektriker) – Wurzelkomponente der Elektriker-Demo. Gleiche Mechanik
 * wie die Tischler-App: Zustand nur im Speicher, kurze Lade-Animation,
 * Umschalten zwischen Formular und fertigem Angebot. Die Kalkulation passiert
 * ausschließlich in `generateQuote` (./calculation.ts).
 */

const GENERATION_DELAY_MS = 1000

export default function App() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevising, setIsRevising] = useState(false)

  function handleGenerate(input: QuoteInput) {
    setIsGenerating(true)
    // // TODO: später durch echte Preisliste/API ersetzen (siehe README)
    window.setTimeout(() => {
      setQuote(generateQuote(input))
      setIsGenerating(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, GENERATION_DELAY_MS)
  }

  function handleReset() {
    setQuote(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Überarbeitung: zweites Angebot mit Stunden-Korrektur und Hinweisen. */
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
      <header className="no-print print-exact sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              EM
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">Angebotsassistent</p>
              <p className="text-xs leading-tight text-slate-400">Elektro Mustermann GmbH</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Wechsel zur Tischler-Demo (liegt eine Ebene höher) */}
            <a
              href="../"
              className="hidden text-xs font-medium text-slate-300 underline-offset-2 hover:text-white hover:underline sm:inline"
            >
              ↗ Tischler-Demo
            </a>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
              Demo
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {quote ? (
          <QuoteDocument
            quote={quote}
            onReset={handleReset}
            onRevise={handleRevise}
            isRevising={isRevising}
          />
        ) : (
          <div className="relative">
            <div className="no-print mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Elektro-Angebot in Sekunden erstellen
              </h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Eckdaten der Anfrage eingeben – der Assistent erzeugt ein vollständiges, gegliedertes
                Angebot inkl. Material, Schutztechnik, Arbeitszeit und VDE-Inbetriebnahme. Tipp:{' '}
                <span className="font-medium text-brand-700">„Beispiel laden“</span> füllt das
                Formular mit einem realistischen Fall.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <QuoteForm onGenerate={handleGenerate} isGenerating={isGenerating} />
            </div>

            {isGenerating && <GeneratingOverlay />}
          </div>
        )}
      </main>
    </div>
  )
}

function GeneratingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-lg">
        <div className="flex gap-1.5">
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
