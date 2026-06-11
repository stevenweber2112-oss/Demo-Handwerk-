import { useState } from 'react'
import {
  PROJECT_TYPE_OPTIONS,
  BUILDING_OPTIONS,
  VERLEGUNG_OPTIONS,
  SERIE_OPTIONS,
  VERTEILER_OPTIONS,
  type QuoteInput,
  type ProjectType,
  type BuildingType,
  type Verlegung,
  type Serie,
  type Verteiler,
} from '../calculation'

/**
 * QuoteForm (Elektriker) – Eingabeformular für die Kundenanfrage.
 * Gleiches Muster wie die Tischler-Version: Zahlenfelder als Strings (dürfen
 * leer sein), Umwandlung in Zahlen erst beim Absenden.
 */

interface QuoteFormProps {
  onGenerate: (input: QuoteInput) => void
  isGenerating: boolean
}

interface FormState {
  customerName: string
  customerNumber: string
  customerAddress: string
  projectType: ProjectType
  building: BuildingType
  verlegung: Verlegung
  serie: Serie
  verteiler: Verteiler
  flaecheM2: string
  steckdosen: string
  schalter: string
  lichtauslaesse: string
  stromkreise: string
  kabelMeter: string
  wallboxKw: string
  pvKwp: string
  distanceKm: string
  rabattProzent: string
  notes: string
}

const EMPTY_FORM: FormState = {
  customerName: '',
  customerNumber: '',
  customerAddress: '',
  projectType: 'neuinstallation',
  building: 'altbau',
  verlegung: 'unterputz',
  serie: 'gehoben',
  verteiler: 'mittel',
  flaecheM2: '',
  steckdosen: '',
  schalter: '',
  lichtauslaesse: '',
  stromkreise: '',
  kabelMeter: '',
  wallboxKw: '',
  pvKwp: '',
  distanceKm: '',
  rabattProzent: '',
  notes: '',
}

/** Realistischer Beispiel-Fall (Sanierung 3-Zimmer-Altbauwohnung). */
const EXAMPLE_FORM: FormState = {
  customerName: 'Familie Krüger',
  customerNumber: '',
  customerAddress: 'Gartenweg 8\n04109 Leipzig',
  projectType: 'neuinstallation',
  building: 'altbau',
  verlegung: 'unterputz',
  serie: 'gehoben',
  verteiler: 'mittel',
  flaecheM2: '85',
  steckdosen: '32',
  schalter: '14',
  lichtauslaesse: '12',
  stromkreise: '8',
  kabelMeter: '350',
  wallboxKw: '',
  pvKwp: '',
  distanceKm: '18',
  rabattProzent: '3',
  notes:
    'Komplettsanierung 3-Zimmer-Altbauwohnung, neue Unterverteilung mit FI/LS, ' +
    'zwei Netzwerkdosen in Wohn- und Arbeitszimmer, Bewegungsmelder im Flur.',
}

/** Zahlenfelder, die – wenn ausgefüllt – als Menge zählen. */
const MENGEN_FELDER: (keyof FormState)[] = [
  'flaecheM2',
  'steckdosen',
  'schalter',
  'lichtauslaesse',
  'stromkreise',
  'wallboxKw',
  'pvKwp',
]

export default function QuoteForm({ onGenerate, isGenerating }: QuoteFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key] && !prev._mengen) return prev
      const next = { ...prev }
      delete next[key]
      delete next._mengen
      return next
    })
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {}

    // Alle optionalen Zahlenfelder: wenn ausgefüllt, müssen sie ≥ 0 sein.
    const numberFields: (keyof FormState)[] = [
      ...MENGEN_FELDER,
      'kabelMeter',
      'distanceKm',
      'rabattProzent',
    ]
    for (const field of numberFields) {
      const raw = form[field] as string
      if (raw.trim() !== '') {
        const num = Number(raw)
        if (!Number.isFinite(num) || num < 0) next[field] = 'Bitte eine Zahl ≥ 0 angeben'
      }
    }
    // Rabatt zusätzlich auf 0–100 begrenzen.
    if (form.rabattProzent.trim() !== '') {
      const r = Number(form.rabattProzent)
      if (Number.isFinite(r) && r > 100) next.rabattProzent = 'Höchstens 100 %'
    }

    // Mindestens eine Menge muss angegeben sein, sonst gibt es nichts zu rechnen.
    const hatMenge = MENGEN_FELDER.some((f) => {
      const raw = form[f] as string
      return raw.trim() !== '' && Number(raw) > 0
    })
    if (!hatMenge) {
      next._mengen = 'Bitte mindestens eine Menge angeben (z. B. Steckdosen, Fläche oder Wallbox).'
    }

    return next
  }

  function num(raw: string): number {
    return raw.trim() === '' ? 0 : Number(raw)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const input: QuoteInput = {
      projectType: form.projectType,
      building: form.building,
      verlegung: form.verlegung,
      serie: form.serie,
      verteiler: form.verteiler,
      flaecheM2: num(form.flaecheM2),
      steckdosen: num(form.steckdosen),
      schalter: num(form.schalter),
      lichtauslaesse: num(form.lichtauslaesse),
      stromkreise: num(form.stromkreise),
      kabelMeter: num(form.kabelMeter),
      wallboxKw: num(form.wallboxKw),
      pvKwp: num(form.pvKwp),
      distanceKm: num(form.distanceKm),
      rabattProzent: num(form.rabattProzent),
      customerName: form.customerName.trim(),
      customerNumber: form.customerNumber.trim(),
      customerAddress: form.customerAddress.trim(),
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
      {/* ---------- Kundendaten ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Kundendaten
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Name / Firma" hint="optional">
            <input
              type="text"
              className={`${baseControlClass} border-slate-300 focus:border-brand-500`}
              value={form.customerName}
              onChange={(e) => update('customerName', e.target.value)}
              placeholder="z. B. Familie Krüger"
            />
          </Field>
          <Field label="Kundennummer" hint="optional – wird sonst vergeben">
            <input
              type="text"
              className={`${baseControlClass} border-slate-300 focus:border-brand-500`}
              value={form.customerNumber}
              onChange={(e) => update('customerNumber', e.target.value)}
              placeholder="z. B. K-1042"
            />
          </Field>
        </div>
        <Field label="Anschrift" hint="Straße, PLZ Ort – optional">
          <textarea
            className={`${baseControlClass} min-h-[72px] resize-y border-slate-300 focus:border-brand-500`}
            value={form.customerAddress}
            onChange={(e) => update('customerAddress', e.target.value)}
            placeholder={'Straße und Hausnummer\nPLZ Ort'}
          />
        </Field>
      </fieldset>

      {/* ---------- Projekt & Gebäude ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Projekt &amp; Gebäude
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
          <Field label="Wohn-/Nutzfläche" hint="m², optional" error={errors.flaecheM2}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.flaecheM2)}
              value={form.flaecheM2}
              onChange={(e) => update('flaecheM2', e.target.value)}
              placeholder="z. B. 85"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Gebäudeart" required>
            <select
              className={selectClass}
              value={form.building}
              onChange={(e) => update('building', e.target.value as BuildingType)}
            >
              {BUILDING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Verlegeart" required>
            <select
              className={selectClass}
              value={form.verlegung}
              onChange={(e) => update('verlegung', e.target.value as Verlegung)}
            >
              {VERLEGUNG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {/* ---------- Mengen ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Mengen
        </legend>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Field label="Steckdosen" hint="Stk" error={errors.steckdosen}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.steckdosen)}
              value={form.steckdosen}
              onChange={(e) => update('steckdosen', e.target.value)}
              placeholder="32"
            />
          </Field>
          <Field label="Schalter" hint="Stk" error={errors.schalter}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.schalter)}
              value={form.schalter}
              onChange={(e) => update('schalter', e.target.value)}
              placeholder="14"
            />
          </Field>
          <Field label="Lichtauslässe" hint="Stk" error={errors.lichtauslaesse}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.lichtauslaesse)}
              value={form.lichtauslaesse}
              onChange={(e) => update('lichtauslaesse', e.target.value)}
              placeholder="12"
            />
          </Field>
          <Field label="Stromkreise" hint="Stk" error={errors.stromkreise}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.stromkreise)}
              value={form.stromkreise}
              onChange={(e) => update('stromkreise', e.target.value)}
              placeholder="8"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Verteiler / Unterverteilung" required>
            <select
              className={selectClass}
              value={form.verteiler}
              onChange={(e) => update('verteiler', e.target.value as Verteiler)}
            >
              {VERTEILER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Leitungslänge gesamt" hint="m, optional" error={errors.kabelMeter}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.kabelMeter)}
              value={form.kabelMeter}
              onChange={(e) => update('kabelMeter', e.target.value)}
              placeholder="wird sonst geschätzt"
            />
          </Field>
        </div>
        {errors._mengen && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {errors._mengen}
          </p>
        )}
      </fieldset>

      {/* ---------- Geräte (optional) ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Geräte &amp; Anlagentechnik <span className="font-normal normal-case text-slate-400">(optional)</span>
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="E-Auto-Wallbox" hint="kW, 0 = keine" error={errors.wallboxKw}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.wallboxKw)}
              value={form.wallboxKw}
              onChange={(e) => update('wallboxKw', e.target.value)}
              placeholder="z. B. 11"
            />
          </Field>
          <Field label="PV-Anlage" hint="kWp, 0 = keine" error={errors.pvKwp}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.pvKwp)}
              value={form.pvKwp}
              onChange={(e) => update('pvKwp', e.target.value)}
              placeholder="z. B. 8"
            />
          </Field>
        </div>
      </fieldset>

      {/* ---------- Material & Konditionen ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Material &amp; Konditionen
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Schalterserie / Qualität" required>
            <select
              className={selectClass}
              value={form.serie}
              onChange={(e) => update('serie', e.target.value as Serie)}
            >
              {SERIE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Entfernung zur Baustelle" hint="km, optional" error={errors.distanceKm}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className={inputClass(!!errors.distanceKm)}
              value={form.distanceKm}
              onChange={(e) => update('distanceKm', e.target.value)}
              placeholder="z. B. 18"
            />
          </Field>
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

      {/* ---------- Sonderwünsche ---------- */}
      <fieldset className="space-y-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Sonderwünsche
        </legend>
        <Field label="Freitext / Anmerkungen" hint="optional">
          <textarea
            className={`${baseControlClass} min-h-[96px] resize-y border-slate-300 focus:border-brand-500`}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="z. B. KNX-Vorbereitung, Netzwerkverkabelung, besondere Leuchten …"
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

/* ---------- Wiederverwendbare UI-Bausteine (nur in dieser Datei) ---------- */

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

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

const baseControlClass =
  'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40'

const selectClass = `${baseControlClass} border-slate-300 focus:border-brand-500`

function inputClass(hasError: boolean): string {
  return `${baseControlClass} ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
      : 'border-slate-300 focus:border-brand-500'
  }`
}
