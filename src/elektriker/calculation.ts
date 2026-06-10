/**
 * =============================================================================
 *  KALKULATIONS-MODUL  –  ELEKTRIKER-DEMO
 * =============================================================================
 *
 *  Eigenständiges Gegenstück zur Tischler-Kalkulation (src/lib/calculation.ts).
 *  Gleicher Aufbau, gleiche Idee: Die UI ruft nur `generateQuote(input)` auf
 *  und bekommt ein fertiges, strukturiertes Angebot (`Quote`) zurück.
 *
 *  --> Preise, Zuschläge und Formeln für einen ELEKTROBETRIEB stehen hier in
 *      den klar markierten Blöcken. Du musst dafür keinen React-Code anfassen.
 *
 *  Die Preise sind grobe, realistische deutsche Marktwerte (2025) für eine
 *  Demo – NICHT für echte Angebote gedacht.
 *
 *  Aufbau:
 *    1) TypeScript-Typen
 *    2) Beschriftungen (Labels) + Auswahllisten für die Dropdowns
 *    3) PREIS-KONSTANTEN  <-- hier anpassen
 *    4) Mengen-/Aufwandsermittlung (aus den Eingaben)
 *    5) Hilfsfunktionen
 *    6) Hauptfunktion generateQuote()
 *
 *  // TODO: später durch echte Preisliste/API ersetzen
 * =============================================================================
 */

/* ===========================================================================
 * 1) TYPEN
 * ======================================================================== */

/** Projekttyp – grobe Art des Auftrags. */
export type ProjectType =
  | 'neuinstallation'
  | 'zaehlerschrank'
  | 'steckdosen_schalter'
  | 'beleuchtung'
  | 'smarthome'
  | 'wallbox'
  | 'pv_anlage'
  | 'fehlersuche'
  | 'sonstiges'

/** Gebäudeart – beeinflusst v. a. Stemm-/Nebenarbeiten und Aufwand. */
export type BuildingType = 'neubau' | 'altbau' | 'kernsanierung'

/** Verlegeart der Leitungen. */
export type Verlegung = 'unterputz' | 'aufputz' | 'leerrohr'

/** Material-/Schalterserie (Qualitätsstufe von Schaltern & Steckdosen). */
export type Serie = 'standard' | 'gehoben' | 'premium'

/** Größe der (Unter-)Verteilung. */
export type Verteiler = 'keiner' | 'klein' | 'mittel' | 'gross'

/** Eingabedaten aus dem Formular. Mengen als Stückzahlen, Längen in Metern. */
export interface QuoteInput {
  projectType: ProjectType
  building: BuildingType
  verlegung: Verlegung
  serie: Serie
  verteiler: Verteiler
  /** Wohn-/Nutzfläche in m² (optional, dient zur Schätzung). */
  flaecheM2: number
  /** Anzahl Steckdosen. */
  steckdosen: number
  /** Anzahl Schalter (Licht-, Dimmer-, Taster …). */
  schalter: number
  /** Anzahl Lichtauslässe / Leuchtenanschlüsse. */
  lichtauslaesse: number
  /** Anzahl Stromkreise. */
  stromkreise: number
  /** Leitungslänge gesamt in Metern (optional – sonst geschätzt). */
  kabelMeter: number
  /** Wallbox-Leistung in kW (0 = keine). */
  wallboxKw: number
  /** PV-Leistung in kWp (0 = keine). */
  pvKwp: number
  /** Einfache Entfernung zur Baustelle in km. */
  distanceKm: number
  /** Optionaler Nachlass / Rabatt in Prozent (0 = kein Nachlass). */
  rabattProzent: number
  /** Freitext für Sonderwünsche. */
  notes: string
}

/** Eine Angebotsposition (Tabellenzeile). */
export interface QuotePosition {
  position: number
  description: string
  unit: string
  quantity: number
  unitPrice: number
  total: number
}

/** Eine Gruppe inkl. Positionen und Zwischensumme. */
export interface QuoteGroup {
  name: string
  positions: QuotePosition[]
  subtotal: number
}

/** Das fertige Angebot. */
export interface Quote {
  quoteNumber: string
  date: string
  projectSummary: string
  groups: QuoteGroup[]
  /** Zwischensumme netto (Summe aller Gruppen, vor Nachlass). */
  zwischensumme: number
  rabattProzent: number
  rabattBetrag: number
  /** Netto nach Abzug des Nachlasses. */
  net: number
  vatRate: number
  vat: number
  gross: number
  /** Im Angebot enthaltener Lohn-/Arbeitsanteil (netto, nach Nachlass) –
   *  für Privatkunden anteilig nach § 35a EStG steuerlich absetzbar. */
  lohnanteil: number
  estimatedDuration: string
  input: QuoteInput
}

/* ===========================================================================
 * 2) BESCHRIFTUNGEN + AUSWAHLLISTEN
 * ======================================================================== */

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  neuinstallation: 'Neuinstallation / Sanierung',
  zaehlerschrank: 'Zählerschrank / Unterverteilung',
  steckdosen_schalter: 'Steckdosen & Schalter',
  beleuchtung: 'Beleuchtung / Lichtinstallation',
  smarthome: 'Netzwerk / Smart Home (KNX)',
  wallbox: 'E-Auto-Wallbox',
  pv_anlage: 'PV-Anlage / Speicher',
  fehlersuche: 'Fehlersuche / Reparatur',
  sonstiges: 'Sonstiges',
}

export const BUILDING_LABELS: Record<BuildingType, string> = {
  neubau: 'Neubau',
  altbau: 'Altbau / Bestand',
  kernsanierung: 'Kernsanierung',
}

export const VERLEGUNG_LABELS: Record<Verlegung, string> = {
  unterputz: 'Unterputz',
  aufputz: 'Aufputz',
  leerrohr: 'Leerrohr / Installationsrohr',
}

export const SERIE_LABELS: Record<Serie, string> = {
  standard: 'Standard',
  gehoben: 'Markenqualität (z. B. Gira, Busch-Jaeger)',
  premium: 'Premium / Designserie',
}

export const VERTEILER_LABELS: Record<Verteiler, string> = {
  keiner: 'Keine / vorhanden',
  klein: 'Unterverteilung klein (bis ~12 TE)',
  mittel: 'Unterverteilung mittel (~24 TE)',
  gross: 'Haupt-/Großverteilung (~48 TE)',
}

function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
}

export const PROJECT_TYPE_OPTIONS = toOptions(PROJECT_TYPE_LABELS)
export const BUILDING_OPTIONS = toOptions(BUILDING_LABELS)
export const VERLEGUNG_OPTIONS = toOptions(VERLEGUNG_LABELS)
export const SERIE_OPTIONS = toOptions(SERIE_LABELS)
export const VERTEILER_OPTIONS = toOptions(VERTEILER_LABELS)

/* ===========================================================================
 * 3) PREIS-KONSTANTEN   <==========  HIER PREISE ANPASSEN  ==========>
 *    Alle Beträge NETTO in Euro. Grobe Richtwerte (DE 2025) für die Demo.
 * ======================================================================== */

/** Stundensatz Elektroinstallateur (€/h). */
const STUNDENSATZ = 65

/** Mehrwertsteuersatz. */
const MWST_SATZ = 0.19

/** Kleinmaterial-/Verbrauchsmaterialpauschale (Klemmen, Schrauben, Dübel …). */
const KLEINMATERIAL_AUFSCHLAG = 0.08 // = 8 % auf den Materialwert

// --- Material ---------------------------------------------------------------

/** Leitung/Kabel pro Meter (Mischpreis NYM-J 3×1,5 / 5×2,5). */
const KABEL_PREIS_PRO_M = 1.3
/** Installationsrohr (Leerrohr) pro Meter – nur bei Verlegeart „Leerrohr“. */
const LEERROHR_PREIS_PRO_M = 0.85

/** Steckdosen-Materialpreis je Stück nach Serie. */
const STECKDOSE_PREIS: Record<Serie, number> = { standard: 4, gehoben: 9, premium: 18 }
/** Schalter-Materialpreis je Stück nach Serie. */
const SCHALTER_PREIS: Record<Serie, number> = { standard: 5, gehoben: 11, premium: 22 }
/** Lichtauslass (Dose, Klemmen, Kleinteile) je Stück – serienunabhängig. */
const LICHTAUSLASS_PREIS = 4

/** Verteiler-/Schrankmaterial je Größe. */
const VERTEILER_PREIS: Record<Verteiler, number> = {
  keiner: 0,
  klein: 120,
  mittel: 280,
  gross: 550,
}
/** Leitungsschutzschalter (LS / „Sicherung“) je Stromkreis. */
const LS_PREIS = 8
/** FI-/RCD-Schutzschalter je Gruppe (ca. je 4 Stromkreise einer). */
const FI_PREIS = 42

/** Wallbox-Gerätepreis (11 kW vs. 22 kW). */
const WALLBOX_PREIS_11KW = 690
const WALLBOX_PREIS_22KW = 980
/** Zusätzlicher FI Typ B für die Wallbox. */
const WALLBOX_FI_TYP_B = 120
/** PV-Anlage grobe Material-Pauschale je kWp (Module + Wechselrichter-Anteil). */
const PV_PREIS_PRO_KWP = 950

// --- Arbeitszeit (Stunden) --------------------------------------------------

/** Arbeitszeit je Installationspunkt (Steckdose/Schalter/Lichtauslass). */
const STD_PRO_PUNKT = 0.6
/** Arbeitszeit je Stromkreis (Leitung ziehen, im Verteiler auflegen). */
const STD_PRO_STROMKREIS = 1.0
/** Arbeitszeit für die Verteiler-Montage je Größe. */
const STD_VERTEILER: Record<Verteiler, number> = { keiner: 0, klein: 3, mittel: 6, gross: 10 }
/** Arbeitszeit Wallbox-Installation. */
const STD_WALLBOX = 6
/** Arbeitszeit PV je kWp (AC-seitige Installation, Anschluss). */
const STD_PV_PRO_KWP = 0.8
/** Inbetriebnahme + Mess-/Prüfprotokoll (DIN VDE 0100-600): Basis + je Stromkreis. */
const STD_INBETRIEBNAHME_BASIS = 1.5
const STD_INBETRIEBNAHME_PRO_STROMKREIS = 0.25

/** Aufwands-Faktor je Gebäudeart (Altbau = mehr Aufwand). */
const GEBAEUDE_FAKTOR: Record<BuildingType, number> = {
  neubau: 1.0,
  altbau: 1.3,
  kernsanierung: 1.2,
}
/** Aufwands-Faktor je Verlegeart. */
const VERLEGUNG_FAKTOR: Record<Verlegung, number> = {
  unterputz: 1.0,
  aufputz: 0.9,
  leerrohr: 1.05,
}

// --- Stemm-/Nebenarbeiten & Anfahrt ----------------------------------------

/** Stemm-/Schlitzarbeiten inkl. Verputz/Entsorgung je Installationspunkt
 *  (nur bei Altbau/Kernsanierung + Unterputz). */
const STEMM_PRO_PUNKT = 7

/** Anfahrt: Pauschale + Kilometersatz (gilt für Hin- und Rückfahrt). */
const ANFAHRT_PAUSCHALE = 39
const ANFAHRT_PREIS_PRO_KM = 0.9

/* ===========================================================================
 * 4) MENGEN-/AUFWANDSERMITTLUNG
 *    Aus den Eingaben werden die effektiven Mengen bestimmt. Fehlende Angaben
 *    werden – wo sinnvoll – aus Fläche/Punkten plausibel geschätzt.
 * ======================================================================== */

interface Mengen {
  steckdosen: number
  schalter: number
  lichtauslaesse: number
  punkte: number
  stromkreise: number
  kabelMeter: number
  hatWallbox: boolean
  wallboxKw: number
  hatPV: boolean
  pvKwp: number
}

function computeMengen(input: QuoteInput): Mengen {
  let steckdosen = Math.max(0, Math.round(input.steckdosen))
  let schalter = Math.max(0, Math.round(input.schalter))
  let lichtauslaesse = Math.max(0, Math.round(input.lichtauslaesse))

  // Sind keine Punkte angegeben, aber eine Fläche, schätzen wir grob:
  // ~0,7 Installationspunkte pro m², aufgeteilt in Steckdosen/Schalter/Licht.
  const flaeche = Math.max(0, input.flaecheM2)
  if (steckdosen + schalter + lichtauslaesse === 0 && flaeche > 0) {
    const punkteApprox = Math.round(flaeche * 0.7)
    steckdosen = Math.round(punkteApprox * 0.6)
    schalter = Math.round(punkteApprox * 0.22)
    lichtauslaesse = Math.max(0, punkteApprox - steckdosen - schalter)
  }

  const punkte = steckdosen + schalter + lichtauslaesse

  // Stromkreise: Angabe nutzen, sonst grob 1 Kreis je 8 Punkte (mind. 1, wenn Punkte).
  let stromkreise = Math.max(0, Math.round(input.stromkreise))
  if (stromkreise === 0 && punkte > 0) {
    stromkreise = Math.max(1, Math.round(punkte / 8))
  }

  // Leitungslänge: Angabe nutzen, sonst ~8 m je Punkt + ~12 m je Stromkreis.
  let kabelMeter = Math.max(0, Math.round(input.kabelMeter))
  if (kabelMeter === 0 && punkte > 0) {
    kabelMeter = Math.round(punkte * 8 + stromkreise * 12)
  }

  // Wallbox / PV: aus Eingabe oder Projekttyp ableiten.
  let wallboxKw = Math.max(0, input.wallboxKw)
  if (wallboxKw === 0 && input.projectType === 'wallbox') wallboxKw = 11
  let pvKwp = Math.max(0, input.pvKwp)
  if (pvKwp === 0 && input.projectType === 'pv_anlage') pvKwp = 8

  return {
    steckdosen,
    schalter,
    lichtauslaesse,
    punkte,
    stromkreise,
    kabelMeter,
    hatWallbox: wallboxKw > 0,
    wallboxKw,
    hatPV: pvKwp > 0,
    pvKwp,
  }
}

/* ===========================================================================
 * 5) HILFSFUNKTIONEN
 * ======================================================================== */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const euroFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

/** Formatiert einen Betrag als "1.234,56 €". */
export function formatEuro(value: number): string {
  return euroFormatter.format(value)
}

/** Formatiert eine Menge mit deutscher Schreibweise. */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function buildQuoteNumber(date: Date): string {
  const year = date.getFullYear()
  const suffix = String(Math.floor(1000 + Math.random() * 9000))
  return `AN-${year}-${suffix}`
}

function buildProjectSummary(input: QuoteInput, m: Mengen): string {
  const teile: string[] = [PROJECT_TYPE_LABELS[input.projectType]]
  teile.push(`${BUILDING_LABELS[input.building]}, ${VERLEGUNG_LABELS[input.verlegung]}`)
  if (input.flaecheM2 > 0) teile.push(`${input.flaecheM2} m²`)
  if (m.punkte > 0) teile.push(`${m.punkte} Installationspunkte`)
  if (m.stromkreise > 0) teile.push(`${m.stromkreise} Stromkreise`)
  if (m.hatWallbox) teile.push(`Wallbox ${m.wallboxKw} kW`)
  if (m.hatPV) teile.push(`PV ${m.pvKwp} kWp`)
  return teile.join(' · ')
}

/* ===========================================================================
 * 6) HAUPTFUNKTION
 *
 *    // TODO: später durch echte Preisliste/API ersetzen
 *    Einzige Schnittstelle zur UI. Signatur (QuoteInput -> Quote) beibehalten,
 *    dann kann die gesamte Oberfläche unverändert weiterlaufen.
 * ======================================================================== */

export function generateQuote(input: QuoteInput): Quote {
  const m = computeMengen(input)

  const gLeitungen: Omit<QuotePosition, 'position'>[] = []
  const gInstallation: Omit<QuotePosition, 'position'>[] = []
  const gVerteiler: Omit<QuotePosition, 'position'>[] = []
  const gGeraete: Omit<QuotePosition, 'position'>[] = []
  const gArbeit: Omit<QuotePosition, 'position'>[] = []
  const gStemm: Omit<QuotePosition, 'position'>[] = []
  const gAnfahrt: Omit<QuotePosition, 'position'>[] = []

  // --- (1) LEITUNGEN & VERLEGEMATERIAL ----------------------------------
  if (m.kabelMeter > 0) {
    gLeitungen.push({
      description: 'Leitungen / Kabel (NYM-J, Mischpreis)',
      unit: 'm',
      quantity: m.kabelMeter,
      unitPrice: KABEL_PREIS_PRO_M,
      total: round2(m.kabelMeter * KABEL_PREIS_PRO_M),
    })
    if (input.verlegung === 'leerrohr') {
      const rohrMeter = Math.round(m.kabelMeter * 0.5)
      gLeitungen.push({
        description: 'Installationsrohr (Leerrohr)',
        unit: 'm',
        quantity: rohrMeter,
        unitPrice: LEERROHR_PREIS_PRO_M,
        total: round2(rohrMeter * LEERROHR_PREIS_PRO_M),
      })
    }
  }

  // --- (2) INSTALLATIONSMATERIAL ----------------------------------------
  if (m.steckdosen > 0) {
    gInstallation.push({
      description: `Steckdosen inkl. Rahmen (${SERIE_LABELS[input.serie]})`,
      unit: 'Stk',
      quantity: m.steckdosen,
      unitPrice: STECKDOSE_PREIS[input.serie],
      total: round2(m.steckdosen * STECKDOSE_PREIS[input.serie]),
    })
  }
  if (m.schalter > 0) {
    gInstallation.push({
      description: `Schalter / Taster (${SERIE_LABELS[input.serie]})`,
      unit: 'Stk',
      quantity: m.schalter,
      unitPrice: SCHALTER_PREIS[input.serie],
      total: round2(m.schalter * SCHALTER_PREIS[input.serie]),
    })
  }
  if (m.lichtauslaesse > 0) {
    gInstallation.push({
      description: 'Lichtauslässe (Dosen, Klemmen, Anschluss)',
      unit: 'Stk',
      quantity: m.lichtauslaesse,
      unitPrice: LICHTAUSLASS_PREIS,
      total: round2(m.lichtauslaesse * LICHTAUSLASS_PREIS),
    })
  }

  // --- (3) VERTEILER & SCHUTZTECHNIK ------------------------------------
  if (input.verteiler !== 'keiner') {
    gVerteiler.push({
      description: `${VERTEILER_LABELS[input.verteiler]} (Schrank, Schienen, Verdrahtung)`,
      unit: 'Stk',
      quantity: 1,
      unitPrice: VERTEILER_PREIS[input.verteiler],
      total: VERTEILER_PREIS[input.verteiler],
    })
  }
  if (m.stromkreise > 0) {
    gVerteiler.push({
      description: 'Leitungsschutzschalter (LS) je Stromkreis',
      unit: 'Stk',
      quantity: m.stromkreise,
      unitPrice: LS_PREIS,
      total: round2(m.stromkreise * LS_PREIS),
    })
    const anzahlFI = Math.max(1, Math.ceil(m.stromkreise / 4))
    gVerteiler.push({
      description: 'FI-/RCD-Schutzschalter',
      unit: 'Stk',
      quantity: anzahlFI,
      unitPrice: FI_PREIS,
      total: round2(anzahlFI * FI_PREIS),
    })
  }

  // --- (4) GERÄTE & ANLAGENTECHNIK (nur bei Wallbox/PV) -----------------
  if (m.hatWallbox) {
    const preis = m.wallboxKw >= 22 ? WALLBOX_PREIS_22KW : WALLBOX_PREIS_11KW
    gGeraete.push({
      description: `Wallbox ${m.wallboxKw} kW (Ladestation)`,
      unit: 'Stk',
      quantity: 1,
      unitPrice: preis,
      total: preis,
    })
    gGeraete.push({
      description: 'FI Typ B für Ladeschaltung',
      unit: 'Stk',
      quantity: 1,
      unitPrice: WALLBOX_FI_TYP_B,
      total: WALLBOX_FI_TYP_B,
    })
  }
  if (m.hatPV) {
    gGeraete.push({
      description: 'PV-Anlage (Module + Wechselrichter, Pauschale je kWp)',
      unit: 'kWp',
      quantity: m.pvKwp,
      unitPrice: PV_PREIS_PRO_KWP,
      total: round2(m.pvKwp * PV_PREIS_PRO_KWP),
    })
  }

  // --- Kleinmaterialpauschale (auf den bisherigen Materialwert) ----------
  const materialBasis =
    sum(gLeitungen) + sum(gInstallation) + sum(gVerteiler) + sum(gGeraete)
  if (materialBasis > 0) {
    const klein = round2(materialBasis * KLEINMATERIAL_AUFSCHLAG)
    gLeitungen.push({
      description: `Kleinmaterial-/Verbrauchspauschale (${Math.round(
        KLEINMATERIAL_AUFSCHLAG * 100,
      )} %)`,
      unit: 'Pauschale',
      quantity: 1,
      unitPrice: klein,
      total: klein,
    })
  }

  // --- (5) ARBEITSZEIT / MONTAGE ----------------------------------------
  const faktor = GEBAEUDE_FAKTOR[input.building] * VERLEGUNG_FAKTOR[input.verlegung]
  const installStunden = round2(
    (m.punkte * STD_PRO_PUNKT + m.stromkreise * STD_PRO_STROMKREIS) * faktor +
      STD_VERTEILER[input.verteiler] +
      (m.hatWallbox ? STD_WALLBOX : 0) +
      (m.hatPV ? m.pvKwp * STD_PV_PRO_KWP : 0),
  )
  if (installStunden > 0) {
    gArbeit.push({
      description: 'Installation, Verdrahtung & Montage',
      unit: 'Std',
      quantity: installStunden,
      unitPrice: STUNDENSATZ,
      total: round2(installStunden * STUNDENSATZ),
    })
  }
  const inbetriebStunden = round2(
    STD_INBETRIEBNAHME_BASIS + m.stromkreise * STD_INBETRIEBNAHME_PRO_STROMKREIS,
  )
  gArbeit.push({
    description: 'Inbetriebnahme, Messung & Prüfprotokoll (DIN VDE 0100-600)',
    unit: 'Std',
    quantity: inbetriebStunden,
    unitPrice: STUNDENSATZ,
    total: round2(inbetriebStunden * STUNDENSATZ),
  })

  // --- (6) STEMM- & NEBENARBEITEN (nur Altbau/Kernsanierung + Unterputz) -
  const braucheStemm =
    (input.building === 'altbau' || input.building === 'kernsanierung') &&
    input.verlegung === 'unterputz' &&
    m.punkte > 0
  if (braucheStemm) {
    gStemm.push({
      description: 'Stemm-/Schlitzarbeiten inkl. Verputz und Entsorgung',
      unit: 'Punkt',
      quantity: m.punkte,
      unitPrice: STEMM_PRO_PUNKT,
      total: round2(m.punkte * STEMM_PRO_PUNKT),
    })
  }

  // --- (7) ANFAHRT ------------------------------------------------------
  gAnfahrt.push({
    description: 'Anfahrtspauschale',
    unit: 'Pauschale',
    quantity: 1,
    unitPrice: ANFAHRT_PAUSCHALE,
    total: ANFAHRT_PAUSCHALE,
  })
  if (input.distanceKm > 0) {
    const km = round2(input.distanceKm * 2)
    gAnfahrt.push({
      description: 'Fahrtkosten (Hin- und Rückfahrt)',
      unit: 'km',
      quantity: km,
      unitPrice: ANFAHRT_PREIS_PRO_KM,
      total: round2(km * ANFAHRT_PREIS_PRO_KM),
    })
  }

  // --- Gruppen zusammenbauen, leere weglassen, durchnummerieren ----------
  const rawGroups: { name: string; positions: Omit<QuotePosition, 'position'>[] }[] = [
    { name: 'Leitungen & Verlegematerial', positions: gLeitungen },
    { name: 'Installationsmaterial', positions: gInstallation },
    { name: 'Verteiler & Schutztechnik', positions: gVerteiler },
    { name: 'Geräte & Anlagentechnik', positions: gGeraete },
    { name: 'Arbeitszeit / Montage', positions: gArbeit },
    { name: 'Stemm- & Nebenarbeiten', positions: gStemm },
    { name: 'Anfahrt', positions: gAnfahrt },
  ]

  let posCounter = 0
  const groups: QuoteGroup[] = rawGroups
    .filter((g) => g.positions.length > 0)
    .map((g) => {
      const positions: QuotePosition[] = g.positions.map((p) => ({ position: ++posCounter, ...p }))
      const subtotal = round2(positions.reduce((s, p) => s + p.total, 0))
      return { name: g.name, positions, subtotal }
    })

  // --- Summen (inkl. optionalem Nachlass / Rabatt) ----------------------
  const zwischensumme = round2(groups.reduce((s, g) => s + g.subtotal, 0))
  const rabattProzent = clamp(input.rabattProzent, 0, 100)
  const rabattBetrag = round2(zwischensumme * (rabattProzent / 100))
  const net = round2(zwischensumme - rabattBetrag)
  const vat = round2(net * MWST_SATZ)
  const gross = round2(net + vat)

  // Lohnanteil = alle Positionen mit Einheit „Std“ (anteilig um den Nachlass
  // gemindert). Wird im Angebot separat ausgewiesen – relevant für Privat-
  // kunden, die Handwerker-Lohnkosten anteilig absetzen können (§ 35a EStG).
  const lohnBrutto = groups
    .flatMap((g) => g.positions)
    .filter((p) => p.unit === 'Std')
    .reduce((s, p) => s + p.total, 0)
  const lohnanteil = round2(lohnBrutto * (1 - rabattProzent / 100))

  // --- Geschätzte Ausführungsdauer (aus Gesamtstunden, ~8 h/Arbeitstag) --
  const gesamtStunden = installStunden + inbetriebStunden
  const tage = clamp(Math.round(gesamtStunden / 8), 1, 60)
  const estimatedDuration = `ca. ${tage}–${tage + 2} Arbeitstage`

  const date = new Date()
  return {
    quoteNumber: buildQuoteNumber(date),
    date: new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
    projectSummary: buildProjectSummary(input, m),
    groups,
    zwischensumme,
    rabattProzent,
    rabattBetrag,
    net,
    vatRate: MWST_SATZ,
    vat,
    gross,
    lohnanteil,
    estimatedDuration,
    input,
  }
}

/** Summe der `total`-Felder einer Positionsliste. */
function sum(positions: Omit<QuotePosition, 'position'>[]): number {
  return positions.reduce((s, p) => s + p.total, 0)
}
