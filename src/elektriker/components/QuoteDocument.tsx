import { formatEuro, formatNumber, type Quote, type QuoteGroup } from '../calculation'

/**
 * QuoteDocument (Elektriker) – stellt das fertige Angebot als professionelles
 * Dokument dar. Gegenüber der Tischler-Version zusätzlich (inspiriert von
 * gängiger Handwerker-Software wie plancraft, aber in eigenem Design):
 *   - Nachlass-/Rabatt-Zeile in der Summenrechnung
 *   - separater Ausweis des Lohnanteils (§ 35a EStG, steuerlich absetzbar)
 *   - Skonto in den Zahlungsbedingungen, Bankverbindung im Fuß
 */

interface QuoteDocumentProps {
  quote: Quote
  onReset: () => void
}

/** Platzhalter-Stammdaten des Betriebs. Hier den echten Betrieb eintragen. */
const FIRMA = {
  name: 'Elektro Mustermann GmbH',
  inhaber: 'Elektromeisterbetrieb · Inh. Max Mustermann',
  strasse: 'Industriestraße 7',
  ort: '12345 Musterstadt',
  telefon: '01234 / 56 78 90',
  email: 'info@elektro-mustermann.de',
  steuernr: 'DE123456789',
  iban: 'DE00 1234 5678 9012 3456 00',
  bank: 'Musterbank',
}

export default function QuoteDocument({ quote, onReset }: QuoteDocumentProps) {
  return (
    <div>
      {/* ---------- Aktionsleiste (nicht im Druck) ---------- */}
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <BackIcon />
          Neues Angebot
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <PrinterIcon />
          Als PDF drucken
        </button>
      </div>

      {/* ---------- Angebotsdokument ---------- */}
      <article className="print-document mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        {/* Kopf */}
        <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <div className="print-exact flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
                EM
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{FIRMA.name}</h1>
                <p className="text-sm text-slate-500">{FIRMA.inhaber}</p>
              </div>
            </div>
            <div className="mt-4 text-sm leading-relaxed text-slate-500">
              <p>
                {FIRMA.strasse}, {FIRMA.ort}
              </p>
              <p>
                Tel. {FIRMA.telefon} · {FIRMA.email}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-brand-700">Angebot</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <MetaRow label="Angebots-Nr." value={quote.quoteNumber} />
              <MetaRow label="Datum" value={quote.date} />
              <MetaRow label="Kunden-Nr." value="K-1042" />
              <MetaRow label="USt-IdNr." value={FIRMA.steuernr} />
            </dl>
          </div>
        </header>

        {/* Empfänger + Projekt */}
        <section className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Angebot für</p>
            <div className="mt-2 text-sm leading-relaxed text-slate-700">
              <p className="font-medium text-slate-900">Musterkunde</p>
              <p className="text-slate-400">[Anschrift des Kunden]</p>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Leistungsort / Bauvorhaben
            </p>
            <p className="mt-1 text-sm text-slate-400">[Objektadresse]</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Projekt</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{quote.projectSummary}</p>
            {quote.input.notes && (
              <p className="mt-2 text-sm italic leading-relaxed text-slate-500">„{quote.input.notes}“</p>
            )}
          </div>
        </section>

        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Vielen Dank für Ihre Anfrage. Für die beschriebene Elektroinstallation unterbreiten wir
          Ihnen gerne folgendes Angebot – fachgerechte Ausführung nach DIN VDE inklusive:
        </p>

        {/* Positionstabelle */}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="print-exact bg-slate-800 text-left text-xs uppercase tracking-wide text-white">
                <th className="w-12 px-3 py-2.5 font-semibold">Pos.</th>
                <th className="px-3 py-2.5 font-semibold">Bezeichnung</th>
                <th className="w-16 px-3 py-2.5 text-right font-semibold">Einh.</th>
                <th className="w-20 px-3 py-2.5 text-right font-semibold">Menge</th>
                <th className="w-28 px-3 py-2.5 text-right font-semibold">Einzelpreis</th>
                <th className="w-28 px-3 py-2.5 text-right font-semibold">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {quote.groups.map((group) => (
                <GroupBlock key={group.name} group={group} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Summen */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <SummaryRow label="Zwischensumme netto" value={formatEuro(quote.zwischensumme)} />
            {quote.rabattProzent > 0 && (
              <SummaryRow
                label={`Nachlass ${formatNumber(quote.rabattProzent, 0)} %`}
                value={`− ${formatEuro(quote.rabattBetrag)}`}
              />
            )}
            {quote.rabattProzent > 0 && (
              <SummaryRow label="Summe netto" value={formatEuro(quote.net)} strong />
            )}
            <SummaryRow
              label={`zzgl. ${formatNumber(quote.vatRate * 100, 0)} % MwSt.`}
              value={formatEuro(quote.vat)}
            />
            <div className="print-exact flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3 text-base font-bold text-brand-800">
              <span>Gesamtbetrag</span>
              <span>{formatEuro(quote.gross)}</span>
            </div>
          </div>
        </div>

        {/* Lohnanteil-Hinweis (§ 35a EStG) */}
        <div className="mt-4 flex justify-end">
          <p className="max-w-md rounded-lg bg-slate-50 px-4 py-3 text-right text-xs leading-relaxed text-slate-500">
            Im Gesamtbetrag enthaltener Lohnanteil:{' '}
            <span className="font-semibold text-slate-700">{formatEuro(quote.lohnanteil)}</span>{' '}
            (netto). Für Privatkunden sind 20 % der Lohnkosten (Handwerkerleistung) bis zu den
            gesetzlichen Höchstgrenzen steuerlich absetzbar (§ 35a EStG).
          </p>
        </div>

        {/* Konditionen */}
        <section className="mt-10 grid grid-cols-1 gap-x-8 gap-y-5 border-t border-slate-200 pt-8 text-sm sm:grid-cols-2">
          <Condition title="Ausführungsdauer">
            {quote.estimatedDuration} nach Auftragsbestätigung und Terminabsprache
          </Condition>
          <Condition title="Gewährleistung">
            5 Jahre gem. § 634a BGB · Ausführung nach DIN VDE 0100 inkl. Mess- und Prüfprotokoll
          </Condition>
          <Condition title="Zahlung &amp; Skonto">
            30 % bei Auftrag, Rest nach Abnahme. 2 % Skonto bei Zahlung innerhalb 10 Tagen, sonst 30
            Tage netto.
          </Condition>
          <Condition title="Gültigkeit des Angebots">4 Wochen ab Angebotsdatum</Condition>
        </section>

        {/* Fuß */}
        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm leading-relaxed text-slate-600">
          <p>
            Über Ihren Auftrag würden wir uns freuen. Für Rückfragen stehen wir Ihnen jederzeit gern
            zur Verfügung.
          </p>
          <p className="mt-4 font-medium text-slate-800">
            Mit freundlichen Grüßen
            <br />
            {FIRMA.name}
          </p>
          <p className="mt-6 text-xs text-slate-400">
            Bankverbindung: {FIRMA.bank} · IBAN {FIRMA.iban} · USt-IdNr. {FIRMA.steuernr}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Demo-Kalkulation auf Basis hinterlegter Beispielpreise · alle Preise in Euro · Angaben
            ohne Gewähr.
          </p>
        </footer>
      </article>
    </div>
  )
}

/* ---------- Unter-Bausteine ---------- */

function GroupBlock({ group }: { group: QuoteGroup }) {
  return (
    <>
      <tr className="print-exact avoid-break border-t border-slate-200 bg-slate-100">
        <td colSpan={6} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
          {group.name}
        </td>
      </tr>
      {group.positions.map((pos) => (
        <tr key={pos.position} className="avoid-break border-t border-slate-100 align-top">
          <td className="px-3 py-2.5 text-slate-400">{pos.position}</td>
          <td className="px-3 py-2.5 text-slate-700">{pos.description}</td>
          <td className="px-3 py-2.5 text-right text-slate-500">{pos.unit}</td>
          <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
            {formatNumber(pos.quantity)}
          </td>
          <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
            {formatEuro(pos.unitPrice)}
          </td>
          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">
            {formatEuro(pos.total)}
          </td>
        </tr>
      ))}
      <tr className="avoid-break border-t border-slate-100">
        <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
          Zwischensumme {group.name}
        </td>
        <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-slate-700">
          {formatEuro(group.subtotal)}
        </td>
      </tr>
    </>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 sm:justify-end">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  )
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-4 ${
        strong ? 'font-semibold text-slate-800' : 'text-slate-600'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function Condition({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 leading-relaxed text-slate-600">{children}</p>
    </div>
  )
}

function PrinterIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5 2.75A.75.75 0 015.75 2h8.5a.75.75 0 01.75.75V6h.25A2.25 2.25 0 0117.5 8.25v4.5A2.25 2.25 0 0115.25 15H15v2.25a.75.75 0 01-.75.75H5.75a.75.75 0 01-.75-.75V15h-.25A2.25 2.25 0 012.5 12.75v-4.5A2.25 2.25 0 014.75 6H5V2.75zM6.5 6h7V3.5h-7V6zm7 8h-7v3h7v-3z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
        clipRule="evenodd"
      />
    </svg>
  )
}
