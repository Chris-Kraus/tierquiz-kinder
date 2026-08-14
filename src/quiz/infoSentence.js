// Infosatz-Generator für den Frage-Bildschirm (Issue #12): baut aus den
// Wikidata-Feldern in einem Tier-Objekt einen kurzen, kindgerechten Satz zum
// jeweiligen Tier — wird nach JEDER beantworteten Frage angezeigt (richtig
// wie falsch, siehe PM-Entscheidung im Issue).
//
// Bindende Leitplanke (mit software-architect abgestimmt, siehe Issue #12):
// Kein Rückgriff auf Wikipedia-Artikeltext (Lizenzgrund, siehe architecture.md
// "Lizenz-/Quellenangabe") — der Satz wird ausschließlich aus den strukturier-
// ten Feldern zusammengesetzt: Basisbaustein aus `category` (einziges neben
// id/name_de garantiertes Pflichtfeld) + optionale Bausteine für
// `habitat`/`continent` (Geografie), `diet` sowie EIN Zusatzfakt aus
// `weight_kg`/`length_cm`/`lifespan_years`/`conservation_status` (zufällig
// gewählt, falls mehrere befüllt sind — siehe PM-Entscheidung, "zufällig
// wechselnd" statt feste Priorität).
//
// Grammatik-Entscheidung "Der/Die {name_de}" vs. Formulierung hier:
// name_de ist ein freier String (500 unterschiedliche Tiernamen) OHNE
// eigenes Genus-Feld im Datenschema — anders als category/habitat/continent/
// diet/conservation_status ist es also KEIN kleines Enum, für das eine
// Mapping-Tabelle sinnvoll wäre. Ein grammatisches Geschlecht für name_de zu
// *raten* (z. B. per Endungs-Heuristik) würde regelmäßig zu genau dem
// falschen "der/die/das" führen, das die Akzeptanzkriterien explizit
// ausschließen. Deshalb: `name_de` wird als Stichwort/Überschrift verwendet
// ("Löwe: Ein Säugetier, das …"), nicht als Satzsubjekt mit Artikel — dadurch
// ist der Satz *garantiert* grammatisch korrekt, unabhängig vom (uns
// unbekannten) Genus des jeweiligen Tiernamens. Das Genus/die Präposition
// aller tatsächlich verwendeten Enum-Felder (category, habitat, continent,
// diet, conservation_status) läuft dagegen konsequent über die Mapping-
// Tabellen unten.

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Deutsche Zahlschreibweise (Komma statt Punkt), max. 1 Nachkommastelle —
// reicht für ein Kinderquiz und vermeidet lange Dezimalzahlen aus den rohen
// Wikidata-Werten (z. B. 58.802 kg).
function formatDeNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(".", ",");
}

function shuffle(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom(array, rng) {
  return array[Math.min(array.length - 1, Math.floor(rng() * array.length))];
}

// Basisbaustein: Genus/Artikel/Relativpronomen je category-Enum-Wert (siehe
// architecture.md, category-Enum). `noun` weicht bei "Sonstiges" bewusst vom
// Rohwert ab (kindgerechter als "ein Sonstiges"). Unbekannte/zukünftige
// Enum-Werte fallen auf FALLBACK_CATEGORY_INFO zurück (kein Crash).
const CATEGORY_INFO = {
  Säugetier: { article: "ein", noun: "Säugetier", relativePronoun: "das" },
  Vogel: { article: "ein", noun: "Vogel", relativePronoun: "der" },
  Reptil: { article: "ein", noun: "Reptil", relativePronoun: "das" },
  Amphibie: { article: "eine", noun: "Amphibie", relativePronoun: "die" },
  Fisch: { article: "ein", noun: "Fisch", relativePronoun: "der" },
  Insekt: { article: "ein", noun: "Insekt", relativePronoun: "das" },
  Spinnentier: {
    article: "ein",
    noun: "Spinnentier",
    relativePronoun: "das",
  },
  Weichtier: { article: "ein", noun: "Weichtier", relativePronoun: "das" },
  Sonstiges: {
    article: "ein",
    noun: "besonderes Tier",
    relativePronoun: "das",
  },
};
const FALLBACK_CATEGORY_INFO = {
  article: "ein",
  noun: "Tier",
  relativePronoun: "das",
};

// Geografie-Baustein: Lebensraum-Präpositionalphrase je bekanntem habitat-
// Wert. Reale Daten enthalten vereinzelt sehr unsaubere Werte (z. B. eine
// Liste von Ländernamen bei einem einzelnen Tier statt Lebensraumtypen,
// bekanntes Datenqualitätsproblem außerhalb des Scopes dieses Issues) — nicht
// gemappte Werte werden beim Bauen des Satzes einfach übersprungen statt
// geraten (siehe pickPhrasesForValues unten), damit nie eine falsche
// Präposition/Flexion entsteht.
const HABITAT_PHRASES = {
  Wald: "im Wald",
  Buschland: "im Buschland",
  Grasland: "im Grasland",
  Savanne: "in der Savanne",
  Wüste: "in der Wüste",
  Berg: "im Gebirge",
  Gebirge: "im Gebirge",
  Steppe: "in der Steppe",
  Dschungel: "im Dschungel",
  "tropischer Regenwald": "im tropischen Regenwald",
  "Borealer Nadelwald": "im Nadelwald",
  Auwald: "im Auwald",
  Süßwasser: "im Süßwasser",
  Meer: "im Meer",
  Weltmeere: "in den Weltmeeren",
  "Arktischer Ozean": "im Arktischen Ozean",
  Ozean: "im Ozean",
  Fluss: "im Fluss",
  See: "im See",
  Teich: "im Teich",
  Sumpf: "im Sumpf",
  Feuchtgebiet: "im Feuchtgebiet",
  Mündung: "an der Flussmündung",
  Gezeitenbereich: "im Gezeitenbereich",
  Küste: "an der Küste",
  "coastal margin": "an der Küste",
  Strand: "am Strand",
  Riff: "am Riff",
  Schotterbank: "an der Schotterbank",
  Steinbruch: "im Steinbruch",
  Wiese: "auf der Wiese",
  Garten: "im Garten",
  Land: "an Land",
  Landfläche: "an Land",
  "städtisches Gebiet": "in der Stadt",
  "urban habitat": "in der Stadt",
};

// Geografie-Baustein: Kontinent-Präpositionalphrase. Kontinentnamen brauchen
// im Deutschen i. d. R. keinen Artikel ("in Afrika"), einzelne Ausnahmen
// (Antarktis) sind hier explizit gemappt statt geraten.
const CONTINENT_PHRASES = {
  Afrika: "in Afrika",
  Asien: "in Asien",
  Europa: "in Europa",
  Nordamerika: "in Nordamerika",
  Südamerika: "in Südamerika",
  Amerika: "in Amerika",
  Ozeanien: "in Ozeanien",
  Australien: "in Australien",
  Antarktis: "in der Antarktis",
  Arktis: "in der Arktis",
};

// Diät-Baustein je diet-Enum-Wert (architecture.md: Fleischfresser/
// Pflanzenfresser/Allesfresser — alle maskulin, daher durchgängig "ein").
const DIET_CLAUSES = {
  Fleischfresser: "ein Fleischfresser ist",
  Pflanzenfresser: "ein Pflanzenfresser ist",
  Allesfresser: "ein Allesfresser ist",
};

// Zusatzfakt-Baustein "Gefährdungsstatus" je conservation_status-Enum-Wert
// (architecture.md-Enum) — Werte sind als Prädikativ bereits korrekt
// flektiert, hier nur explizit als Mapping-Tabelle geführt (statt Rohwert
// ungeprüft einzusetzen), damit unbekannte künftige Werte sauber
// übersprungen werden statt einen kaputten Satz zu erzeugen.
const CONSERVATION_STATUS_CLAUSES = {
  "nicht gefährdet": "als nicht gefährdet gilt",
  gefährdet: "als gefährdet gilt",
  "stark gefährdet": "als stark gefährdet gilt",
  "vom Aussterben bedroht": "als vom Aussterben bedroht gilt",
};

/** Wählt aus einem Array roher Feldwerte die (max. `limit`) zufällig
 * ausgewählten, tatsächlich bekannten (gemappten) Phrasen — unbekannte Werte
 * werden übersprungen statt geraten (siehe Kommentar bei HABITAT_PHRASES). */
function pickPhrasesForValues(values, phraseMap, limit, rng) {
  if (!Array.isArray(values)) return [];
  const known = values.filter(
    (value) => isNonEmptyString(value) && phraseMap[value],
  );
  if (known.length === 0) return [];
  return shuffle(known, rng)
    .slice(0, limit)
    .map((value) => phraseMap[value]);
}

function joinWithUnd(parts) {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`;
}

/** Geografie-Baustein: kombiniert bis zu 2 Lebensraum-Phrasen und die
 * Kontinent-Phrase zu einer Verb-letzt-Teilklausel ("in der Savanne und in
 * Afrika lebt"), oder `null`, wenn weder `habitat` noch `continent` einen
 * bekannten Wert liefern. */
function buildGeographyClause(animal, rng) {
  const habitatPhrases = pickPhrasesForValues(
    animal.habitat,
    HABITAT_PHRASES,
    2,
    rng,
  );
  const continentPhrases = pickPhrasesForValues(
    animal.continent,
    CONTINENT_PHRASES,
    1,
    rng,
  );
  const parts = [...habitatPhrases, ...continentPhrases];
  if (parts.length === 0) return null;
  return `${joinWithUnd(parts)} lebt`;
}

function buildDietClause(animal) {
  if (!isNonEmptyString(animal.diet)) return null;
  return DIET_CLAUSES[animal.diet] ?? null;
}

function weightExtraFact(animal) {
  if (!isFiniteNumber(animal.weight_kg)) return null;
  const kg = animal.weight_kg;
  return kg >= 1
    ? `etwa ${formatDeNumber(kg)} Kilogramm wiegt`
    : `etwa ${formatDeNumber(kg * 1000)} Gramm wiegt`;
}

function lengthExtraFact(animal) {
  if (!isFiniteNumber(animal.length_cm)) return null;
  const cm = animal.length_cm;
  return cm >= 100
    ? `etwa ${formatDeNumber(cm / 100)} Meter lang ist`
    : `etwa ${formatDeNumber(cm)} Zentimeter lang ist`;
}

function lifespanExtraFact(animal) {
  if (!isFiniteNumber(animal.lifespan_years)) return null;
  const years = animal.lifespan_years;
  if (years >= 1) {
    const rounded = Math.round(years * 10) / 10;
    const noun = rounded === 1 ? "Jahr" : "Jahre";
    return `etwa ${formatDeNumber(rounded)} ${noun} alt wird`;
  }
  // Fallback für sehr kurzlebige Tiere (< 1 Jahr, z. B. Seidenspinner mit
  // 0,1 Jahren) analog zu weightExtraFact (kg→g) und lengthExtraFact (cm→m):
  // "0,1 Jahre alt" ist für Kinder kaum greifbar, daher Umrechnung in Monate
  // (siehe Issue #12, QA-Bugreport).
  const months = Math.round(years * 12 * 10) / 10;
  const noun = months === 1 ? "Monat" : "Monate";
  return `etwa ${formatDeNumber(months)} ${noun} alt wird`;
}

function conservationStatusExtraFact(animal) {
  if (!isNonEmptyString(animal.conservation_status)) return null;
  return CONSERVATION_STATUS_CLAUSES[animal.conservation_status] ?? null;
}

// Reihenfolge hier ist irrelevant für die Auswahl (siehe buildExtraFactClause
// unten) — sie bestimmt nur die Kandidatenliste, aus der zufällig gezogen
// wird (PM-Entscheidung: "zufällig wechselnd" statt feste Priorität).
const EXTRA_FACT_BUILDERS = [
  weightExtraFact,
  lengthExtraFact,
  lifespanExtraFact,
  conservationStatusExtraFact,
];

/** Zusatzfakt-Baustein: max. EIN Zusatzfakt (Gewicht/Länge/Lebenserwartung/
 * Gefährdungsstatus), zufällig aus den bei diesem Tier tatsächlich befüllten
 * Feldern gewählt — bei wiederholtem Spielen desselben Tieres wechselt die
 * Priorisierung dadurch (siehe PM-Entscheidung im Issue), statt immer
 * denselben Fakt zu zeigen. */
function buildExtraFactClause(animal, rng) {
  const candidates = EXTRA_FACT_BUILDERS.map((build) => build(animal)).filter(
    (clause) => clause !== null,
  );
  if (candidates.length === 0) return null;
  return pickRandom(candidates, rng);
}

/**
 * Baut den Infosatz für ein Tier aus der Fallback-Kette Basis- + optionale
 * Bausteine (siehe Datei-Kommentar oben für die volle Herleitung). Liefert
 * *immer* einen nicht-leeren, grammatisch korrekten Satz — auch im
 * Minimalfall, in dem nur `id`/`name_de`/`category` befüllt sind (Issue #12,
 * Akzeptanzkriterium "Fallback-Kette funktioniert für Tiere mit nur den drei
 * Pflichtfeldern").
 * @param {object} animal Tier-Objekt aus data/animals.json (Schema siehe
 *   architecture.md)
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random (für Tests
 *   austauschbar, analog zu questionGenerator.js)
 * @returns {string}
 */
export function buildInfoSentence(animal, rng = Math.random) {
  const categoryInfo =
    CATEGORY_INFO[animal?.category] ?? FALLBACK_CATEGORY_INFO;
  const name = isNonEmptyString(animal?.name_de) ? animal.name_de : "Es";
  const article =
    categoryInfo.article.charAt(0).toUpperCase() + categoryInfo.article.slice(1);

  const clauses = [
    buildGeographyClause(animal ?? {}, rng),
    buildDietClause(animal ?? {}),
    buildExtraFactClause(animal ?? {}, rng),
  ].filter((clause) => clause !== null);

  if (clauses.length === 0) {
    return `${name}: ${article} ${categoryInfo.noun}.`;
  }

  return `${name}: ${article} ${categoryInfo.noun}, ${categoryInfo.relativePronoun} ${joinWithUnd(clauses)}.`;
}
