import { useState } from 'react'
import {
  PROJECT_TYPE_OPTIONS,
  WOOD_TYPE_OPTIONS,
  SURFACE_OPTIONS,
  HARDWARE_OPTIONS,
  type QuoteInput,
  type ProjectType,
  type WoodType,
  type SurfaceTreatment,
  type HardwareQuality,
} from '../lib/calculation'

/**
 * QuoteForm – das Eingabeformular für die Kundenanfrage.
 *
 * Die Komponente verwaltet ihren eigenen Formular-Zustand. Zahlenfelder werden
 * als Strings gehalten (damit das Feld auch leer sein darf) und erst beim
 * Absenden in Zahlen umgewandelt. Bei gültiger Eingabe wird `onGenerate` mit
 * einem fertigen `QuoteInput` aufgerufen – die eigentliche Kalkulation passiert
 * außerhalb (in App -> calculation.ts).
 */

interface QuoteFormProps {
  onGenerate: (input: QuoteInput) => void
  /** True, solange das Angebot "berechnet" wird (für Button-/Sperr-Zustand). */
  isGenerating: boolean
}

/** Interner Formular-Zustand. Zahlenfelder als String (erlaubt leere Eingabe). */
interface FormState {
  projectType: ProjectType
  widthCm: string
  heightCm: string
  depthCm: string
  woodType: WoodType
  surface: SurfaceTreatment
  hardware: HardwareQuality
  numDoorsDrawers: string
  assembly: boolean
  distanceKm: string
  rabattProzent: string
  notes: string
}

/** Leeres Formular (Startzustand). */
const EMPTY_FORM: FormState = {
  projectType: 'einbauschrank',
  widthCm: '',
  heightCm: '',
  depthCm: '',
  woodType: 'eiche_furniert',
  surface: 'lackiert',
  hardware: 'gehoben',
  numDoorsDrawers: '',
  assembly: false,
  distanceKm: '',
  rabattProzent: '',
  notes: '',
}

/**
 * Realistischer Beispiel-Fall (Einbauschrank). Über den Button "Beispiel laden"
 * füllt sich damit das gesamte Formular – ideal für die schnelle Vorführung.
 */
const EXAMPLE_FORM: FormState = {
  projectType: 'einbauschrank',
  widthCm: '250',
  heightCm: '240',
  depthCm: '60',
  woodType: 'eiche_furniert',
  surface: 'lackiert',
  hardware: 'gehoben',
  numDoorsDrawers: '5',
  assembly: true,
  distanceKm: '25',
  rabattProzent: '',
  notes:
    'Grifflose Fronten mit Push-to-open, je Fach drei Einlegeböden, ' +
    'Sockelblende in Wandfarbe lackiert. Kundin wünscht Lieferung bis Ende des Quartals.',
}

/** Welche Felder sind Pflicht? (für die Validierung) */
type RequiredNumberField = 'widthCm' | 'heightCm' | 'depthCm'

export default function QuoteForm({ onGenerate, isGenerating }: QuoteFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  /** Generischer Feld-Updater. */
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Fehler des Feldes zurücksetzen, sobald der Nutzer es ändert.
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  /** Prüft die Pflichtfelder und gibt eine Fehler-Map zurück. */
  function validate(): Record<string, string> {
    const next: Record<string, string> = {}
    const requiredNumbers: RequiredNumberField[] = ['widthCm', 'heightCm', 'depthCm']

    for (const field of requiredNumbers) {
      const raw = form[field]
      const num = Number(raw)
      if (raw.trim() === '') {
        next[field] = 'Pflichtfeld'
      } else if (!Number.isFinite(num) || num <= 0) {
        next[field] = 'Bitte eine Zahl größer 0 angeben'
      }
    }

    // Optionale Zahlenfelder: wenn ausgefüllt, müssen sie gültig (>= 0) sein.
    for (const field of ['numDoorsDrawers', 'distanceKm', 'rabattProzent'] as const) {
      const raw = form[field]
      if (raw.trim() !== '') {
        const num = Number(raw)
        if (!Number.isFinite(num) || num < 0) {
          next[field] = 'Bitte eine Zahl ≥ 0 angeben'
        }
      }
    }
    // Nachlass zusätzlich auf höchstens 100 % begrenzen.
    if (form.rabattProzent.trim() !== '' && Number(form.rabattProzent) > 100) {
      next.rabattProzent = 'Höchstens 100 %'
    }

    return next
  }

  /** Formular absenden -> validieren -> bei Erfolg onGenerate aufrufen. */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    // FormState (Strings) -> QuoteInput (Zahlen)
    const input: QuoteInput = {
      projectType: form.projectType,
      widthCm: Number(form.widthCm),
      heightCm: Number(form.heightCm),
      depthCm: Number(form.depthCm),
      woodType: form.woodType,
      surface: form.surface,
      hardware: form.hardware,
      numDoorsDrawers: form.numDoorsDrawers.trim() === '' ? 0 : Number(form.numDoorsDrawers),
      assembly: form.assembly,
      distanceKm: form.distanceKm.trim() === '' ? 0 : Number(form.distanceKm),
      rabattProzent: form.rabattProzent.trim() === '' ? 0 : Number(form.rabattProzent),
      notes: form.notes.trim(),
    }
    onGenerate(input)
  }

  function loadExample() {
    setForm(EXAMPLE_FORM)
    setErrors({})
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ---------- Block: Projekt & Maße ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Projekt &amp; Maße
        </legend>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Projekttyp" required>
            <select
              className={selectClass}
              value={form.projectType}
              onChange={(e) => update('projectType', e.target.value as ProjectType)}
            >
              {PROJECT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Anzahl Türen / Schubladen" hint="optional" error={errors.numDoorsDrawers}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.numDoorsDrawers)}
              value={form.numDoorsDrawers}
              onChange={(e) => update('numDoorsDrawers', e.target.value)}
              placeholder="z. B. 5"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Breite" required hint="cm" error={errors.widthCm}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.widthCm)}
              value={form.widthCm}
              onChange={(e) => update('widthCm', e.target.value)}
              placeholder="z. B. 250"
            />
          </Field>
          <Field label="Höhe" required hint="cm" error={errors.heightCm}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.heightCm)}
              value={form.heightCm}
              onChange={(e) => update('heightCm', e.target.value)}
              placeholder="z. B. 240"
            />
          </Field>
          <Field label="Tiefe" required hint="cm" error={errors.depthCm}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.depthCm)}
              value={form.depthCm}
              onChange={(e) => update('depthCm', e.target.value)}
              placeholder="z. B. 60"
            />
          </Field>
        </div>
      </fieldset>

      {/* ---------- Block: Material & Ausführung ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Material &amp; Ausführung
        </legend>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Holzart" required>
            <select
              className={selectClass}
              value={form.woodType}
              onChange={(e) => update('woodType', e.target.value as WoodType)}
            >
              {WOOD_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Oberflächenbehandlung" required>
            <select
              className={selectClass}
              value={form.surface}
              onChange={(e) => update('surface', e.target.value as SurfaceTreatment)}
            >
              {SURFACE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Beschläge-Qualität" required>
            <select
              className={selectClass}
              value={form.hardware}
              onChange={(e) => update('hardware', e.target.value as HardwareQuality)}
            >
              {HARDWARE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {/* ---------- Block: Montage & Anfahrt ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Montage, Anfahrt &amp; Konditionen
        </legend>

        <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition hover:border-brand-400">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.assembly}
              onChange={(e) => update('assembly', e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700">
              Montage beim Kunden gewünscht
            </span>
          </label>

          <Field label="Entfernung zur Baustelle" hint="km, optional" error={errors.distanceKm}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.distanceKm)}
              value={form.distanceKm}
              onChange={(e) => update('distanceKm', e.target.value)}
              placeholder="z. B. 25"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Nachlass / Rabatt" hint="%, optional" error={errors.rabattProzent}>
            <input
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              className={inputClass(!!errors.rabattProzent)}
              value={form.rabattProzent}
              onChange={(e) => update('rabattProzent', e.target.value)}
              placeholder="z. B. 3"
            />
          </Field>
        </div>
      </fieldset>

      {/* ---------- Block: Sonderwünsche ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Sonderwünsche
        </legend>
        <Field label="Freitext / Anmerkungen" hint="optional">
          <textarea
            className={`${baseControlClass} min-h-[96px] resize-y`}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="z. B. grifflose Fronten, besondere Beleuchtung, Farbwünsche …"
          />
        </Field>
      </fieldset>

      {/* ---------- Aktionen ---------- */}
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadExample}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <SparkIcon />
            Beispiel laden
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={isGenerating}
            className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
          >
            Zurücksetzen
          </button>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <Spinner />
              Angebot wird erstellt …
            </>
          ) : (
            <>
              Angebot erstellen
              <ArrowIcon />
            </>
          )}
        </button>
      </div>
    </form>
  )
}

/* ===========================================================================
 *  Kleine, wiederverwendbare UI-Bausteine (nur in dieser Datei genutzt)
 * ======================================================================== */

/** Ein beschriftetes Formularfeld mit optionalem Hinweis und Fehlertext. */
function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

/** Animierter Lade-Spinner (für den Button). */
function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 1.5l1.6 4.3 4.4 1.6-4.4 1.6L10 13.3 8.4 9 4 7.4l4.4-1.6L10 1.5zM4.5 12.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2L1.5 15.5l2.2-.8.8-2.2z" />
    </svg>
  )
}

/* ---------- gemeinsame Tailwind-Klassen für Eingabefelder ---------- */

const baseControlClass =
  'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40'

const selectClass = `${baseControlClass} border-slate-300 focus:border-brand-500`

/** Eingabe-Klasse mit optionaler Fehlermarkierung (roter Rahmen). */
function inputClass(hasError: boolean): string {
  return `${baseControlClass} ${
    hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : 'border-slate-300 focus:border-brand-500'
  }`
}
