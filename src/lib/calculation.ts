/**
 * =============================================================================
 *  KALKULATIONS-MODUL  –  Kernstück des Angebotsassistenten
 * =============================================================================
 *
 *  Diese Datei enthält die KOMPLETTE Preislogik der Demo und ist bewusst
 *  strikt von der Benutzeroberfläche (React) getrennt. Die UI ruft nur die
 *  eine Hauptfunktion `generateQuote(input)` auf und bekommt ein fertiges,
 *  strukturiertes Angebot (`Quote`) zurück.
 *
 *  --> ALLES, was du an Preisen, Zuschlägen, Formeln oder Stundensätzen
 *      anpassen möchtest, findest du hier in den klar markierten Blöcken.
 *      Du musst dafür KEINEN React-Code anfassen.
 *
 *  Die Preise sind realistische deutsche Marktpreise (Stand 2025) als grobe
 *  Richtwerte für eine Demo. Sie sind NICHT für echte Angebote gedacht.
 *
 *  Aufbau der Datei:
 *    1) TypeScript-Typen (QuoteInput, QuotePosition, Quote …)
 *    2) Anzeige-Beschriftungen (Labels) + Auswahllisten für die Dropdowns
 *    3) PREIS-KONSTANTEN  <-- hier anpassen
 *    4) Geometrie/Mengen-Berechnung (aus den Maßen)
 *    5) Hilfsfunktionen (Runden, Formatieren)
 *    6) Hauptfunktion generateQuote()
 *
 *  // TODO: später durch echte Preisliste/API ersetzen
 *  // -> Siehe Abschnitt 6 (Hauptfunktion) bzw. README "Echten KI-Call einbauen".
 *  //    Die Funktion `generateQuote` ist die einzige Schnittstelle, die du
 *  //    austauschen musst, um statt der lokalen Kalkulation z. B. die
 *  //    Anthropic-API oder eine echte Preisliste/Warenwirtschaft anzubinden.
 * =============================================================================
 */

/* ===========================================================================
 * 1) TYPEN
 * ======================================================================== */

/** Projekttyp – bestimmt die Geometrie-/Mengenformel. */
export type ProjectType =
  | 'einbauschrank'
  | 'esstisch'
  | 'kuechenfront'
  | 'regal'
  | 'innentuer'
  | 'sonstiges'

/** Holzart / Plattenwerkstoff – bestimmt den Materialpreis pro m². */
export type WoodType =
  | 'eiche_massiv'
  | 'buche_massiv'
  | 'nussbaum'
  | 'eiche_furniert'
  | 'spanplatte_melamin'
  | 'mdf_lackiert'

/** Oberflächenbehandlung – Aufschlag pro behandeltem m². */
export type SurfaceTreatment = 'geoelt' | 'lackiert' | 'gewachst' | 'roh'

/** Beschläge-Qualität – Stückpreis je Tür/Schublade. */
export type HardwareQuality = 'standard' | 'gehoben' | 'premium'

/**
 * Die Eingabedaten aus dem Formular. Genau dieses Objekt übergibt die UI an
 * `generateQuote`. Alle Maße in Zentimetern, Entfernung in Kilometern.
 */
export interface QuoteInput {
  projectType: ProjectType
  widthCm: number
  heightCm: number
  depthCm: number
  woodType: WoodType
  surface: SurfaceTreatment
  hardware: HardwareQuality
  /** Anzahl Türen + Schubladen (Fronten). Optional -> 0 möglich. */
  numDoorsDrawers: number
  /** Montage beim Kunden gewünscht? */
  assembly: boolean
  /** Einfache Entfernung zur Baustelle in km (für die Anfahrt). */
  distanceKm: number
  /** Optionaler Nachlass / Rabatt in Prozent (0 = kein Nachlass). */
  rabattProzent: number
  /** Freitext für Sonderwünsche. */
  notes: string
}

/** Die 6 fachlichen Gruppen, nach denen das Angebot gegliedert wird. */
export type QuoteGroupName =
  | 'Material'
  | 'Oberflächenbehandlung'
  | 'Beschläge'
  | 'Arbeitszeit / Fertigung'
  | 'Montage'
  | 'Anfahrt'

/** Eine einzelne Angebotsposition (eine Zeile in der Tabelle). */
export interface QuotePosition {
  /** Fortlaufende Positionsnummer über das ganze Angebot (1, 2, 3 …). */
  position: number
  /** Bezeichnung / Beschreibung der Leistung. */
  description: string
  /** Einheit, z. B. 'm²', 'Stk', 'Std', 'km', 'Pauschale'. */
  unit: string
  /** Menge. */
  quantity: number
  /** Einzelpreis NETTO. */
  unitPrice: number
  /** Gesamtpreis NETTO (quantity * unitPrice, auf Cent gerundet). */
  total: number
}

/** Eine Gruppe inkl. ihrer Positionen und Zwischensumme. */
export interface QuoteGroup {
  name: QuoteGroupName
  positions: QuotePosition[]
  /** Zwischensumme NETTO dieser Gruppe. */
  subtotal: number
}

/** Das fertige Angebot, das die UI anzeigt. */
export interface Quote {
  quoteNumber: string
  /** Datum bereits deutsch formatiert, z. B. "09.06.2025". */
  date: string
  /** Menschliche Zusammenfassung des Projekts (eine Zeile). */
  projectSummary: string
  /** Die gefüllten Gruppen (leere Gruppen werden weggelassen). */
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
  /** Geschätzte Ausführungs-/Lieferzeit als Text, z. B. "ca. 5–6 Wochen". */
  estimatedDuration: string
  /** Die ursprüngliche Eingabe (z. B. für die Projektbeschreibung). */
  input: QuoteInput
}

/* ===========================================================================
 * 2) BESCHRIFTUNGEN (LABELS) + AUSWAHLLISTEN
 *    Eine einzige Quelle der Wahrheit: Form-Dropdowns UND Angebotstext
 *    nutzen dieselben Labels.
 * ======================================================================== */

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  einbauschrank: 'Einbauschrank',
  esstisch: 'Esstisch',
  kuechenfront: 'Küchenfront',
  regal: 'Regal / Sideboard',
  innentuer: 'Innentür',
  sonstiges: 'Sonstiges',
}

export const WOOD_TYPE_LABELS: Record<WoodType, string> = {
  eiche_massiv: 'Eiche massiv',
  buche_massiv: 'Buche massiv',
  nussbaum: 'Nussbaum',
  eiche_furniert: 'Eiche furniert',
  spanplatte_melamin: 'Spanplatte melaminbeschichtet',
  mdf_lackiert: 'MDF lackiert',
}

export const SURFACE_LABELS: Record<SurfaceTreatment, string> = {
  geoelt: 'geölt',
  lackiert: 'lackiert',
  gewachst: 'gewachst',
  roh: 'roh / unbehandelt',
}

export const HARDWARE_LABELS: Record<HardwareQuality, string> = {
  standard: 'Standard',
  gehoben: 'gehoben (z. B. Blum)',
  premium: 'Premium',
}

/**
 * Kleine Helfer, um aus den Label-Maps fertige Optionslisten für die
 * <select>-Dropdowns zu erzeugen. So muss die Form nichts doppelt pflegen.
 */
function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }))
}

export const PROJECT_TYPE_OPTIONS = toOptions(PROJECT_TYPE_LABELS)
export const WOOD_TYPE_OPTIONS = toOptions(WOOD_TYPE_LABELS)
export const SURFACE_OPTIONS = toOptions(SURFACE_LABELS)
export const HARDWARE_OPTIONS = toOptions(HARDWARE_LABELS)

/* ===========================================================================
 * 3) PREIS-KONSTANTEN   <==========  HIER PREISE ANPASSEN  ==========>
 *
 *    Alle Beträge sind NETTO in Euro. Die Werte sind grobe Richtwerte für den
 *    deutschen Markt 2025 und dienen nur der Demo.
 * ======================================================================== */

/** Stundensatz der Werkstatt (Fertigung & Montage) in €/h. */
const STUNDENSATZ = 65

/** Mehrwertsteuersatz in Deutschland. */
const MWST_SATZ = 0.19

/**
 * Verschnitt-/Zuschnittaufschlag auf den reinen Materialwert.
 * Üblich sind 10–15 %. Wird als eigene, transparente Position ausgewiesen.
 */
const VERSCHNITT_AUFSCHLAG = 0.12 // = 12 %

/**
 * Materialpreis pro m² Plattenfläche (inkl. grobem Zuschnitt), je Holzart.
 * Massivholz ist hier vereinfachend ebenfalls auf m² Bezugsfläche gerechnet
 * (in der Realität oft m³/lfm) – für eine nachvollziehbare Demo völlig okay.
 */
const MATERIAL_PREIS_PRO_M2: Record<WoodType, number> = {
  eiche_massiv: 185, // Eiche massiv: hochwertiges Vollholz
  buche_massiv: 125,
  nussbaum: 260, // teuerstes Material
  eiche_furniert: 65, // furnierte Trägerplatte
  spanplatte_melamin: 38, // günstigster Werkstoff
  mdf_lackiert: 60, // lackierfähige MDF-Platte
}

/** Aufschlag der Oberflächenbehandlung pro behandeltem m². */
const OBERFLAECHE_PREIS_PRO_M2: Record<SurfaceTreatment, number> = {
  geoelt: 18,
  lackiert: 28, // mehrschichtiger Lackaufbau, aufwendigster Prozess
  gewachst: 16,
  roh: 0, // keine Behandlung
}

/** Beschläge-Stückpreis je Tür/Schublade nach Qualitätsstufe. */
const BESCHLAEGE_PREIS_PRO_STK: Record<HardwareQuality, number> = {
  standard: 15, // einfache Scharniere/Auszüge
  gehoben: 45, // z. B. Blum, Soft-Close
  premium: 85, // Top-Beschläge, grifflos/Servo
}

/** Anfahrt: feste Pauschale + Kilometersatz (gilt für Hin- und Rückfahrt). */
const ANFAHRT_PAUSCHALE = 45 // einmalige Grundpauschale
const ANFAHRT_PREIS_PRO_KM = 0.85 // €/km

/**
 * Basis-Arbeitszeiten je Projekttyp (in Stunden). Dazu kommen flächen- und
 * stückabhängige Anteile (siehe Geometrie-Berechnung unten).
 *   fertigung = Konstruktion + Werkstattfertigung
 *   montage   = Aufbau/Montage beim Kunden (nur falls gewählt)
 */
const ARBEITSZEIT_BASIS: Record<ProjectType, { fertigung: number; montage: number }> = {
  einbauschrank: { fertigung: 6, montage: 2.5 },
  esstisch: { fertigung: 8, montage: 1.0 },
  kuechenfront: { fertigung: 5, montage: 2.0 },
  regal: { fertigung: 4, montage: 1.5 },
  innentuer: { fertigung: 3, montage: 1.0 },
  sonstiges: { fertigung: 5, montage: 1.5 },
}

/** Zusätzliche Fertigungszeit pro m² Materialfläche (h/m²). */
const FERTIGUNG_STD_PRO_M2 = 1.2
/** Zusätzliche Fertigungszeit je Tür/Schublade (h/Stk). */
const FERTIGUNG_STD_PRO_FRONT = 0.8
/** Zusätzliche Montagezeit pro m² Materialfläche (h/m²). */
const MONTAGE_STD_PRO_M2 = 0.3
/** Zusätzliche Montagezeit je Tür/Schublade (h/Stk). */
const MONTAGE_STD_PRO_FRONT = 0.25

/* ===========================================================================
 * 4) GEOMETRIE / MENGEN-BERECHNUNG
 *    Aus Breite/Höhe/Tiefe wird eine plausible Materialfläche und eine zu
 *    behandelnde Oberfläche abgeleitet. Bewusst vereinfacht, aber
 *    nachvollziehbar (Korpusflächen, Fronten, Böden …).
 * ======================================================================== */

interface Geometry {
  /** Gesamte zu verarbeitende Plattenfläche in m² (Korpus + Fronten + Böden). */
  materialAreaM2: number
  /** Zu behandelnde Oberfläche in m² (sichtbare Flächen, beidseitig wo nötig). */
  surfaceAreaM2: number
}

/**
 * Berechnet die Mengen aus den Maßen – je Projekttyp eine eigene, einfache
 * Formel. Alle Eingaben kommen in cm, wir rechnen intern in Metern.
 */
function computeGeometry(input: QuoteInput): Geometry {
  // cm -> m (und keine negativen Werte zulassen)
  const w = Math.max(0, input.widthCm) / 100
  const h = Math.max(0, input.heightCm) / 100
  const d = Math.max(0, input.depthCm) / 100
  const fronts = Math.max(0, input.numDoorsDrawers)

  switch (input.projectType) {
    case 'einbauschrank':
    case 'regal':
    case 'sonstiges': {
      // Korpus: 2 Seiten + Boden + Deckel + Rückwand
      const seiten = 2 * (h * d)
      const bodenDeckel = 2 * (w * d)
      // Regal hat oft eine offene/dünne Rückwand -> halber Ansatz
      const rueckwandFaktor = input.projectType === 'regal' ? 0.5 : 1
      const rueckwand = w * h * rueckwandFaktor
      // Einlegeböden: grob ein Boden je ~40 cm Höhe
      const anzBoeden = clamp(Math.round(h / 0.4) - 1, 1, 8)
      const boeden = anzBoeden * (w * d)
      // Fronten (Türen/Schubladenfronten) bedecken grob die Frontfläche
      const frontFlaeche = w * h
      const corpus = seiten + bodenDeckel + rueckwand + boeden
      const materialAreaM2 = corpus + frontFlaeche
      // Oberfläche: Fronten beidseitig + ~halber Korpus sichtbar
      const surfaceAreaM2 = frontFlaeche * 2 + corpus * 0.5
      return { materialAreaM2, surfaceAreaM2 }
    }

    case 'esstisch': {
      // Tischplatte (oft verleimtes Massivholz -> Faktor für Dicke/Verschnitt)
      const platte = w * d
      const gestell = 0.8 // Beine + Zarge pauschal in m²
      const materialAreaM2 = platte * 1.6 + gestell
      // Oberfläche: Ober- und Unterseite + Kanten/Beine
      const surfaceAreaM2 = platte * 2 + 1.0
      return { materialAreaM2, surfaceAreaM2 }
    }

    case 'kuechenfront': {
      // Im Wesentlichen Fronten (Korpusse kommen oft vom Zulieferer)
      const frontFlaeche = w * h
      const materialAreaM2 = frontFlaeche * 1.1 + fronts * 0.05
      const surfaceAreaM2 = frontFlaeche * 2
      return { materialAreaM2, surfaceAreaM2 }
    }

    case 'innentuer': {
      // Türblatt + Zarge/Rahmen
      const tuerblatt = w * h
      const rahmen = (2 * h + w) * 0.12 // umlaufende Zarge, grob
      const materialAreaM2 = tuerblatt * 1.2 + rahmen
      const surfaceAreaM2 = tuerblatt * 2 + rahmen
      return { materialAreaM2, surfaceAreaM2 }
    }
  }
}

/* ===========================================================================
 * 5) HILFSFUNKTIONEN
 * ======================================================================== */

/** Begrenzt einen Wert auf [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Auf 2 Nachkommastellen (Cent) runden – vermeidet Float-Artefakte. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

// --- Formatierung für die Anzeige (deutsches Format) -----------------------

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

/** Formatiert einen Betrag als "1.234,56 €". */
export function formatEuro(value: number): string {
  return euroFormatter.format(value)
}

/** Formatiert eine Menge mit deutscher Schreibweise (Komma als Dezimaltrenner). */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Baut eine Angebotsnummer der Form "AN-2025-4831".
 * (In der Demo aus Jahr + Zufallszahl, da nichts gespeichert wird.)
 */
function buildQuoteNumber(date: Date): string {
  const year = date.getFullYear()
  const suffix = String(Math.floor(1000 + Math.random() * 9000))
  return `AN-${year}-${suffix}`
}

/** Erzeugt die menschenlesbare Projektzusammenfassung (eine Zeile). */
function buildProjectSummary(input: QuoteInput): string {
  const teile: string[] = [PROJECT_TYPE_LABELS[input.projectType] + ' nach Maß']
  teile.push(`${input.widthCm} × ${input.heightCm} × ${input.depthCm} cm (B×H×T)`)
  teile.push(WOOD_TYPE_LABELS[input.woodType])
  teile.push('Oberfläche ' + SURFACE_LABELS[input.surface])
  if (input.numDoorsDrawers > 0) {
    teile.push(
      `${input.numDoorsDrawers} Front${input.numDoorsDrawers === 1 ? '' : 'en'} ` +
        `(Beschläge ${HARDWARE_LABELS[input.hardware]})`,
    )
  }
  teile.push(input.assembly ? 'inkl. Montage' : 'ohne Montage')
  return teile.join(' · ')
}

/* ===========================================================================
 * 6) HAUPTFUNKTION
 *
 *    // TODO: später durch echte Preisliste/API ersetzen
 *    Dies ist die EINZIGE Schnittstelle zur UI. Möchtest du später eine echte
 *    Kalkulation (z. B. Anthropic-API, ERP-/Preislisten-Anbindung), genügt es,
 *    diese Funktion auszutauschen – Signatur (QuoteInput -> Quote) beibehalten,
 *    und die gesamte Oberfläche funktioniert unverändert weiter.
 *    (Anleitung dazu in der README.)
 * ======================================================================== */

export function generateQuote(input: QuoteInput): Quote {
  // --- Mengen aus den Maßen bestimmen ------------------------------------
  const geo = computeGeometry(input)

  // Wir sammeln die Positionen je Gruppe und nummerieren am Ende durch.
  const groupMaterial: Omit<QuotePosition, 'position'>[] = []
  const groupSurface: Omit<QuotePosition, 'position'>[] = []
  const groupHardware: Omit<QuotePosition, 'position'>[] = []
  const groupLabor: Omit<QuotePosition, 'position'>[] = []
  const groupAssembly: Omit<QuotePosition, 'position'>[] = []
  const groupTravel: Omit<QuotePosition, 'position'>[] = []

  // --- (1) MATERIAL ------------------------------------------------------
  const materialPreisProM2 = MATERIAL_PREIS_PRO_M2[input.woodType]
  const materialMenge = round2(geo.materialAreaM2)
  const materialBasis = round2(materialMenge * materialPreisProM2)
  groupMaterial.push({
    description: `${WOOD_TYPE_LABELS[input.woodType]} – Plattenmaterial / Zuschnitt`,
    unit: 'm²',
    quantity: materialMenge,
    unitPrice: materialPreisProM2,
    total: materialBasis,
  })
  // Verschnitt-/Zuschnittaufschlag als eigene, transparente Position
  const verschnittBetrag = round2(materialBasis * VERSCHNITT_AUFSCHLAG)
  groupMaterial.push({
    description: `Verschnitt- und Zuschnittaufschlag (${Math.round(
      VERSCHNITT_AUFSCHLAG * 100,
    )} %)`,
    unit: 'Pauschale',
    quantity: 1,
    unitPrice: verschnittBetrag,
    total: verschnittBetrag,
  })

  // --- (2) OBERFLÄCHENBEHANDLUNG ----------------------------------------
  const oberflaechePreisProM2 = OBERFLAECHE_PREIS_PRO_M2[input.surface]
  const surfaceMenge = round2(geo.surfaceAreaM2)
  // Auch "roh" ausweisen (0 €), damit die Gruppe vollständig dokumentiert ist.
  groupSurface.push({
    description: `Oberfläche ${SURFACE_LABELS[input.surface]}`,
    unit: 'm²',
    quantity: surfaceMenge,
    unitPrice: oberflaechePreisProM2,
    total: round2(surfaceMenge * oberflaechePreisProM2),
  })

  // --- (3) BESCHLÄGE -----------------------------------------------------
  // Nur sinnvoll, wenn es Türen/Schubladen gibt.
  if (input.numDoorsDrawers > 0) {
    const beschlaegePreis = BESCHLAEGE_PREIS_PRO_STK[input.hardware]
    groupHardware.push({
      description: `Beschläge ${HARDWARE_LABELS[input.hardware]} (Scharniere/Auszüge, Griffe)`,
      unit: 'Stk',
      quantity: input.numDoorsDrawers,
      unitPrice: beschlaegePreis,
      total: round2(input.numDoorsDrawers * beschlaegePreis),
    })
  }

  // --- (4) ARBEITSZEIT / FERTIGUNG --------------------------------------
  const basis = ARBEITSZEIT_BASIS[input.projectType]
  const fertigungStunden = round2(
    basis.fertigung +
      geo.materialAreaM2 * FERTIGUNG_STD_PRO_M2 +
      input.numDoorsDrawers * FERTIGUNG_STD_PRO_FRONT,
  )
  // Wir teilen die Fertigung in zwei nachvollziehbare Posten auf:
  //   ~15 % Konstruktion/Arbeitsvorbereitung, ~85 % Werkstattfertigung.
  const planungStunden = round2(fertigungStunden * 0.15)
  const werkstattStunden = round2(fertigungStunden - planungStunden)
  groupLabor.push({
    description: 'Konstruktion & Arbeitsvorbereitung (CAD, Aufmaß-Planung)',
    unit: 'Std',
    quantity: planungStunden,
    unitPrice: STUNDENSATZ,
    total: round2(planungStunden * STUNDENSATZ),
  })
  groupLabor.push({
    description: 'Fertigung in der Werkstatt (Zuschnitt, Korpus, Fronten, Montagebau)',
    unit: 'Std',
    quantity: werkstattStunden,
    unitPrice: STUNDENSATZ,
    total: round2(werkstattStunden * STUNDENSATZ),
  })

  // --- (5) MONTAGE (nur wenn gewählt) -----------------------------------
  let montageStunden = 0
  if (input.assembly) {
    montageStunden = round2(
      basis.montage +
        geo.materialAreaM2 * MONTAGE_STD_PRO_M2 +
        input.numDoorsDrawers * MONTAGE_STD_PRO_FRONT,
    )
    groupAssembly.push({
      description: 'Montage und Einbau beim Kunden inkl. Feinjustage',
      unit: 'Std',
      quantity: montageStunden,
      unitPrice: STUNDENSATZ,
      total: round2(montageStunden * STUNDENSATZ),
    })
  }

  // --- (6) ANFAHRT ------------------------------------------------------
  // Sinnvoll, sobald montiert wird oder eine Entfernung angegeben ist.
  if (input.assembly || input.distanceKm > 0) {
    groupTravel.push({
      description: 'Anfahrtspauschale',
      unit: 'Pauschale',
      quantity: 1,
      unitPrice: ANFAHRT_PAUSCHALE,
      total: ANFAHRT_PAUSCHALE,
    })
    if (input.distanceKm > 0) {
      // Hin- und Rückfahrt => einfache Entfernung x 2
      const km = round2(input.distanceKm * 2)
      groupTravel.push({
        description: 'Fahrtkosten (Hin- und Rückfahrt)',
        unit: 'km',
        quantity: km,
        unitPrice: ANFAHRT_PREIS_PRO_KM,
        total: round2(km * ANFAHRT_PREIS_PRO_KM),
      })
    }
  }

  // --- Gruppen zusammenbauen, leere weglassen, durchnummerieren ----------
  const rawGroups: { name: QuoteGroupName; positions: Omit<QuotePosition, 'position'>[] }[] = [
    { name: 'Material', positions: groupMaterial },
    { name: 'Oberflächenbehandlung', positions: groupSurface },
    { name: 'Beschläge', positions: groupHardware },
    { name: 'Arbeitszeit / Fertigung', positions: groupLabor },
    { name: 'Montage', positions: groupAssembly },
    { name: 'Anfahrt', positions: groupTravel },
  ]

  let posCounter = 0
  const groups: QuoteGroup[] = rawGroups
    .filter((g) => g.positions.length > 0)
    .map((g) => {
      const positions: QuotePosition[] = g.positions.map((p) => ({
        position: ++posCounter,
        ...p,
      }))
      const subtotal = round2(positions.reduce((sum, p) => sum + p.total, 0))
      return { name: g.name, positions, subtotal }
    })

  // --- Summen (inkl. optionalem Nachlass / Rabatt) ----------------------
  const zwischensumme = round2(groups.reduce((sum, g) => sum + g.subtotal, 0))
  const rabattProzent = clamp(input.rabattProzent, 0, 100)
  const rabattBetrag = round2(zwischensumme * (rabattProzent / 100))
  const net = round2(zwischensumme - rabattBetrag)
  const vat = round2(net * MWST_SATZ)
  const gross = round2(net + vat)

  // Lohnanteil = alle Positionen mit Einheit „Std“ (anteilig um den Nachlass
  // gemindert). Wird separat ausgewiesen – für Privatkunden anteilig nach
  // § 35a EStG steuerlich absetzbar.
  const lohnBrutto = groups
    .flatMap((g) => g.positions)
    .filter((p) => p.unit === 'Std')
    .reduce((s, p) => s + p.total, 0)
  const lohnanteil = round2(lohnBrutto * (1 - rabattProzent / 100))

  // --- Geschätzte Ausführungs-/Lieferzeit -------------------------------
  // Grobe Heuristik aus Gesamtstunden (inkl. Vorlauf/Werkstattauslastung).
  const gesamtStunden = fertigungStunden + montageStunden
  const wochen = clamp(Math.ceil(gesamtStunden / 25) + 2, 3, 12)
  const estimatedDuration = `ca. ${wochen}–${wochen + 1} Wochen`

  // --- Fertiges Angebot -------------------------------------------------
  const date = new Date()
  return {
    quoteNumber: buildQuoteNumber(date),
    date: new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
    projectSummary: buildProjectSummary(input),
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
