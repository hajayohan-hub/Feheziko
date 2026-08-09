export interface PhonemeArticulationGuide {
  id: string;
  symbol: string;
  frenchPattern: string;
  titleMg: string;
  titleFr: string;
  malagasyContrastMg: string;
  malagasyContrastFr: string;
  lipPosture: string;
  tonguePosture: string;
  airflowGuide: string;
  articulationStepsMg: string[];
  articulationStepsFr: string[];
  commonMistakeMg: string;
  commonMistakeFr: string;
  exampleWords: { word: string; phonetic: string; translationMg: string; translationFr: string }[];
}

export interface ChallengingWordDetail {
  word: string;
  phonetic: string;
  phonemeCategory: string;
  tipMg: string;
  tipFr: string;
  detailedGuideMg?: string;
  detailedGuideFr?: string;
  commonPitfallMg?: string;
  commonPitfallFr?: string;
}

export class PhoneticsService {
  private static instance: PhoneticsService;

  private phonemeGuides: Record<string, PhonemeArticulationGuide> = {
    sound_u: {
      id: "sound_u",
      symbol: "[y]",
      frenchPattern: "u, û, ue",
      titleMg: "Ny feo 'U' [y] (Le son 'U')",
      titleFr: "Le son 'U' [y] (Voyelle fermée antérieure)",
      malagasyContrastMg: "Tsy misy amin'ny teny Malagasy ny feo 'U' [y]. Tsy mitovy amin'ny 'OU' [u] (toy ny amin'ny 'ouais') ary tsy 'I' [i].",
      malagasyContrastFr: "Inexistant en malgache. Les locuteurs malgachophones le confondent souvent avec le son 'OU' [u] ou 'I' [i].",
      lipPosture: "👄 Molotra mikatona sy mipoitra boribory be tahaka ny hisoka sioka (Lèvres très arrondies et projetées)",
      tonguePosture: "👅 Ny lela kosa dia mipetraka aloha mankany amin'ny nify ambany toy ny hiteny 'I' (Langue en position du 'I')",
      airflowGuide: "💨 Ny rivotra dia mivoaka amin'ny vava amin'ny alalan'ny lavaka kely amin'ny molotra",
      articulationStepsMg: [
        "1. Teneno ao an-tsaina aloha ny feo 'i' (ampidino eo amin'ny nify ambany ny lela).",
        "2. Tsy mihetsika ny lela fa ovay boribory be sy mipoitra aloha ny molotrao.",
        "3. Avoahy ny feo : ho re amin'izay ny 'U' frantsay madio (toy ny amin'ny 'salut')."
      ],
      articulationStepsFr: [
        "1. Prononcez la voyelle 'i' en gardant la langue avancée contre les dents du bas.",
        "2. Sans bouger la langue, arrondissez et projetez fortement les lèvres en avant.",
        "3. Émettez le son : vous obtenez le 'U' français parfait."
      ],
      commonMistakeMg: "Kely saina fisoloana ny 'U' ho 'OU' (ohatra: 'Salut' tononina hoe 'Salou' na 'Tu' tononina hoe 'Tou').",
      commonMistakeFr: "Remplacement fréquent du 'U' par 'OU' (ex: 'salut' prononcé 'salou').",
      exampleWords: [
        { word: "Salut", phonetic: "saly", translationMg: "Salama", translationFr: "Salut" },
        { word: "Tu", phonetic: "ty", translationMg: "Ianao", translationFr: "Tu" },
        { word: "Une", phonetic: "yn", translationMg: "Iray (vavy)", translationFr: "Une" },
        { word: "Musique", phonetic: "myzik", translationMg: "Mozika", translationFr: "Musique" },
        { word: "Étudier", phonetic: "etydje", translationMg: "Mianatra", translationFr: "Étudier" }
      ]
    },

    sound_r: {
      id: "sound_r",
      symbol: "[ʁ]",
      frenchPattern: "r, rr",
      titleMg: "Ny 'R' frantsay am-tenda [ʁ] (Le 'R' guttural)",
      titleFr: "Le 'R' grasseyé ou guttural [ʁ]",
      malagasyContrastMg: "Amin'ny teny Malagasy, ny 'R' dia tononina amin'ny tendron'ny lela eo amin'ny nify (roulé). Amin'ny teny Frantsay kosa, am-tenda no amoahana azy.",
      malagasyContrastFr: "Le 'R' malgache est roulé avec la pointe de la langue. Le 'R' français se produit à l'arrière du palais (guttural).",
      lipPosture: "👄 Mivoha amin'ny fomba voajanahary ny molotra",
      tonguePosture: "👅 Ny tendron'ny lela dia mipetraka ambany, ny fototry ny lela ao aoriana kosa no manakaiky ny lela kely (luette)",
      airflowGuide: "💨 Ny rivotra dia mampihovitrovitra malefaka ny fototry ny tenda sy ny lela kely",
      articulationStepsMg: [
        "1. Alao sary an-tsaina hoe hisasa tenda (gargarisme) ianao fa tsy misy rano.",
        "2. Avelao ho amin'ny nify ambany ny tendron'ny lela, ary asehoy hivoaka moramora ao an-tenda ny rivotra.",
        "3. Aza ahosoy mafy loatra ny lela, fa avelao hisy fihovitrovitana malefaka ao an-tenda."
      ],
      articulationStepsFr: [
        "1. Imaginez faire un gargarisme doux sans eau à l'arrière de la gorge.",
        "2. Gardez la pointe de la langue reposée en bas et faites vibrer le voile du palais.",
        "3. Laissez s'échapper l'air pour un 'R' fluide et élégant."
      ],
      commonMistakeMg: "Fihovitrovitana ny tendron'ny lela amin'ny nify (R roulé malgache).",
      commonMistakeFr: "Ruler la pointe de la langue au lieu de faire vibrer l'arrière de la gorge.",
      exampleWords: [
        { word: "Bonjour", phonetic: "bɔ̃ʒuʁ", translationMg: "Manao ahoana", translationFr: "Bonjour" },
        { word: "Merci", phonetic: "mɛʁsi", translationMg: "Misaotra", translationFr: "Merci" },
        { word: "Père", phonetic: "pɛʁ", translationMg: "Ray", translationFr: "Père" },
        { word: "Paris", phonetic: "paʁi", translationMg: "Paris", translationFr: "Paris" }
      ]
    },

    nasal_an: {
      id: "nasal_an",
      symbol: "[ɑ̃]",
      frenchPattern: "an, am, en, em",
      titleMg: "Ny feo avy amin'ny orona 'AN/EN' [ɑ̃]",
      titleFr: "La voyelle nasale 'AN/EN' [ɑ̃]",
      malagasyContrastMg: "Tsy misy voyelle nasale amin'ny teny Malagasy. Tononina mitokana ny voyelle sy ny 'n' na 'm' amin'ny malagasy. Amin'ny frantsay, feo iray miara-mivoaka amin'ny orona sy vava izany.",
      malagasyContrastFr: "En malgache, les voyelles suivies de N/M se prononcent distinctement. En français, c'est une voyelle nasale unique.",
      lipPosture: "👄 Vava misokatra boribory lehibe indrindra (Bouche bien ouverte et ovale)",
      tonguePosture: "👅 Ny lela dia miantona ao aoriana, ampidinina kely ny voaly ny lanitra (palais)",
      airflowGuide: "💨 Rivotra mizara roa: mivoaka indray miara amin'ny vava sy ny orona, tsy mikatona ny nify",
      articulationStepsMg: [
        "1. Sokafy tsara ny vava toy ny hiteny 'A'.",
        "2. Avelao ny rivotra hivoaka amin'ny orona koa nefa AZA touches-na amin'ny nify ny lela fa tsy misy feo 'N' mipetraka.",
        "3. 'Enchanté' -> ɑ̃-ʃɑ̃-te."
      ],
      articulationStepsFr: [
        "1. Ouvrez largement la bouche comme pour un 'A' grave.",
        "2. Laissez résonner le son simultanément dans la cavité nasale sans fermer la langue sur les dents.",
        "3. Ne prononcez PAS le 'N' consonant à la fin."
      ],
      commonMistakeMg: "Fanononana ny 'N' na 'M' amin'ny molotra/nify (ohatra: 'Enchanté' -> 'An-chan-té').",
      commonMistakeFr: "Articuler le 'N' consonantique final (ex: prononcer 'an-ne' au lieu de [ɑ̃]).",
      exampleWords: [
        { word: "Enchanté", phonetic: "ɑ̃ʃɑ̃te", translationMg: "Faly mahafantatra", translationFr: "Enchanté" },
        { word: "Demain", phonetic: "dəmɛ̃", translationMg: "Ampitso", translationFr: "Demain" },
        { word: "Maman", phonetic: "mamɑ̃", translationMg: "Neny", translationFr: "Maman" }
      ]
    },

    nasal_on: {
      id: "nasal_on",
      symbol: "[ɔ̃]",
      frenchPattern: "on, om",
      titleMg: "Ny feo avy amin'ny orona 'ON' [ɔ̃]",
      titleFr: "La voyelle nasale 'ON' [ɔ̃]",
      malagasyContrastMg: "Feo orona avy amin'ny 'O' misokatra. Tsy tononina manokana ny 'N' na 'M'.",
      malagasyContrastFr: "Voyelle nasale fermée produite avec les lèvres très arrondies.",
      lipPosture: "👄 Molotra boribory mikatona kely (Lèvres très arrondies et serrées)",
      tonguePosture: "👅 Ny lela dia mankany aoriana sy ambany",
      airflowGuide: "💨 Rivotra mivoaka amin'ny orona sy vava indray miara",
      articulationStepsMg: [
        "1. Amboary ny molotrao ho amin'ny feo 'O'.",
        "2. Asehoy hivoaka amin'ny orona ny feo tsy misy fikatonan'ny lela na nify amin'ny 'N'.",
        "3. 'Bonjour' -> bɔ̃-ʒuʁ."
      ],
      articulationStepsFr: [
        "1. Formez un 'O' bien rond avec les lèvres.",
        "2. Dirigez le flux d'air vers le nez sans faire claquer la langue contre le palais."
      ],
      commonMistakeMg: "Fanononana 'On-ne' miaraka amin'ny 'N' mafy.",
      commonMistakeFr: "Prononcer le N final audible.",
      exampleWords: [
        { word: "Bonjour", phonetic: "bɔ̃ʒuʁ", translationMg: "Manao ahoana", translationFr: "Bonjour" },
        { word: "Combien", phonetic: "kɔ̃bjɛ̃", translationMg: "Ohatrinona", translationFr: "Combien" },
        { word: "Maison", phonetic: "mɛzɔ̃", translationMg: "Trano", translationFr: "Maison" }
      ]
    },

    nasal_in: {
      id: "nasal_in",
      symbol: "[ɛ̃]",
      frenchPattern: "in, im, ain, aim, ein, un, um",
      titleMg: "Ny feo avy amin'ny orona 'IN/AIN/UN' [ɛ̃]",
      titleFr: "La voyelle nasale 'IN/AIN/UN' [ɛ̃]",
      malagasyContrastMg: "Feo orona avy amin'ny 'È' mivelatra. Maro ny tsipelina amin'ny frantsay (in, ain, ein, un) fa iray ihany ny feo [ɛ̃].",
      malagasyContrastFr: "Regroupe plusieurs graphies (in, ain, ein, un) sous le même timbre nasal ouvert.",
      lipPosture: "👄 Molotra misokatra mitsiky kely (Lèvres étirées en sourire léger)",
      tonguePosture: "👅 Lela miakatra kely eo aloha",
      airflowGuide: "💨 Rivotra mivoaka am-bava sy amin'ny orona",
      articulationStepsMg: [
        "1. Mitsikia kely toy ny hiteny 'È'.",
        "2. Avoahy amin'ny orona ny feo fa nefa aza mikatona ny nify amin'ny 'N'.",
        "3. 'Cinq' -> sɛ̃k, 'Un' -> œ̃/[ɛ̃]."
      ],
      articulationStepsFr: [
        "1. Souriez légèrement en préparant le son 'È'.",
        "2. Laissez passer l'air par le nez sans toucher les dents supérieures avec la langue."
      ],
      commonMistakeMg: "Kely saina fisoloana 'IN' ho 'EEN' (toy ny 'in-ne').",
      commonMistakeFr: "Confondre [ɛ̃] avec le son oral 'i' + 'n'.",
      exampleWords: [
        { word: "Cinq", phonetic: "sɛ̃k", translationMg: "Dimy", translationFr: "Cinq" },
        { word: "Demain", phonetic: "dəmɛ̃", translationMg: "Ampitso", translationFr: "Demain" },
        { word: "Paiement", phonetic: "pɛmɑ̃", translationMg: "Fandoavam-bola", translationFr: "Paiement" }
      ]
    },

    sound_eu: {
      id: "sound_eu",
      symbol: "[ø] / [œ]",
      frenchPattern: "eu, œu",
      titleMg: "Ny feo 'EU' [ø] (Le son 'EU')",
      titleFr: "Les voyelles moyennes 'EU' [ø] et [œ]",
      malagasyContrastMg: "Tsy misy amin'ny teny Malagasy. Manelanelana ny 'É' sy ny 'O'.",
      malagasyContrastFr: "Inexistant en malgache. Combinaison de la position de la langue du 'É' et des lèvres du 'O'.",
      lipPosture: "👄 Molotra mipoitra boribory toy ny amin'ny 'O'",
      tonguePosture: "👅 Lela mipetraka aloha toy ny amin'ny 'É'",
      airflowGuide: "💨 Rivotra mivoaka am-bava",
      articulationStepsMg: [
        "1. Teneno ny feo 'É'.",
        "2. Tsy mihetsika ny lela fa ovay boribory ny molotrao.",
        "3. 'Deux' -> dø."
      ],
      articulationStepsFr: [
        "1. Prononcez la voyelle 'É'.",
        "2. Sans bouger la langue, avancez et arrondissez les lèvres."
      ],
      commonMistakeMg: "Fisoloana ho 'E' tsotra na 'O' tsotra (Deux -> De na Do).",
      commonMistakeFr: "Prononcer un 'E' plat ou un 'O' pur.",
      exampleWords: [
        { word: "Deux", phonetic: "dø", translationMg: "Roa", translationFr: "Deux" },
        { word: "Monsieur", phonetic: "məsjø", translationMg: "Andriamatoa", translationFr: "Monsieur" },
        { word: "Bleu", phonetic: "blø", translationMg: "Manga", translationFr: "Bleu" }
      ]
    },

    sound_ch_j: {
      id: "sound_ch_j",
      symbol: "[ʃ] / [ʒ]",
      frenchPattern: "ch, j, g (+e/i)",
      titleMg: "Ny feo 'CH' sy 'J' [ʃ] / [ʒ]",
      titleFr: "Les fricatives 'CH' [ʃ] et 'J/G' [ʒ]",
      malagasyContrastMg: "Ny mpiteny malagasy dia matetika manonona 'TS' na 'DZ' ho solon'ny 'CH' na 'J'. Amin'ny frantsay, feo mikoriana moramora (fricative) izy ireo fa tsy misy fikatonana (affriquée).",
      malagasyContrastFr: "Tendance des malgachophones à affriquer ces sons en 'TS' ou 'DZ'. En français, l'air doit glisser sans blocage.",
      lipPosture: "👄 Molotra mipoitra kely aloha (Lèvres légèrement avancées)",
      tonguePosture: "👅 Lela miakatra tsy mikasika ny lanitra nefa mamela lalam-rivotra kely",
      airflowGuide: "💨 Rivotra mivoaka moramora misitrisitra (chhh na zhhh)",
      articulationStepsMg: [
        "1. Aza dondronina amin'ny nify ny lela (aza manao TS).",
        "2. Avoahy moramora tahaka ny mampangina olona ny rivotra (chhh...).",
        "3. Mba hahazoana ny 'J' / [ʒ], nify sy tenda kely asiana fihovitrovitana (zhhh... Bonjour)."
      ],
      articulationStepsFr: [
        "1. Ne bloquez pas l'air avec la langue contre les dents (pas de son 'TS').",
        "2. Émettez un souffle continu de chuintement régulier."
      ],
      commonMistakeMg: "Fanononana 'TS' ho solon'ny 'CH' (Bonjour -> Bondzour, Cher -> Tser).",
      commonMistakeFr: "Prononcer 'TS' au lieu de 'CH' ou 'DZ' au lieu de 'J'.",
      exampleWords: [
        { word: "Bonjour", phonetic: "bɔ̃ʒuʁ", translationMg: "Manao ahoana", translationFr: "Bonjour" },
        { word: "Cher", phonetic: "ʃɛʁ", translationMg: "Lafo", translationFr: "Cher" },
        { word: "Je", phonetic: "ʒə", translationMg: "Izaho", translationFr: "Je" }
      ]
    },

    sound_oi: {
      id: "sound_oi",
      symbol: "[wa]",
      frenchPattern: "oi, oî",
      titleMg: "Ny feo 'OI' [wa]",
      titleFr: "La semi-voyelle 'OI' [wa]",
      malagasyContrastMg: "Ny 'OI' amin'ny frantsay dia tononina 'WA' (w sy a) fa tsy 'O-I' roa vava.",
      malagasyContrastFr: "Combinaison rapide de la semi-consonne [w] et de la voyelle [a].",
      lipPosture: "👄 Miova haingana avy amin'ny molotra boribory ho am-bava misokatra",
      tonguePosture: "👅 Lela miala aoriana haingana mankany aloha",
      airflowGuide: "💨 Rivotra mivoaka haingana amin'ny fiovan'ny vava",
      articulationStepsMg: [
        "1. Atombohy amin'ny molotra mikatona (w).",
        "2. Sokafy haingana amin'ny feo 'A' mangilatra.",
        "3. 'Au revoir' -> o-ʁə-vwaʁ."
      ],
      articulationStepsFr: [
        "1. Partez des lèvres serrées en cul-de-poule [w].",
        "2. Ouvrez instantanément vers le [a]."
      ],
      commonMistakeMg: "Fanononana misaraka 'O-I'.",
      commonMistakeFr: "Séparer le son en deux voyelles distinctes 'O' et 'I'.",
      exampleWords: [
        { word: "Au revoir", phonetic: "oʁvwaʁ", translationMg: "Veloma", translationFr: "Au revoir" },
        { word: "Trois", phonetic: "tʁwa", translationMg: "Telo", translationFr: "Trois" },
        { word: "Droite", phonetic: "dʁwat", translationMg: "Kavanana", translationFr: "Droite" }
      ]
    },

    silent_final: {
      id: "silent_final",
      symbol: "[-]",
      frenchPattern: "e, es, s, t, d, x, z (en fin de mot)",
      titleMg: "Fiafaran'ny teny mangina (Consonnes et Voyelles muettes)",
      titleFr: "Lettres finales muettes",
      malagasyContrastMg: "Amin'ny teny Malagasy, ny teny rehetra dia mifana amin'ny voyelle hatrany (o, a, y, e). Amin'ny teny frantsay kosa, maro ny litera amin'ny farany tsy tononina mihitsy.",
      malagasyContrastFr: "Le malgache termine toujours ses mots par une voyelle. En français, de nombreuses consonnes finales sont muettes.",
      lipPosture: "👄 Mijanona eo amin'ny feo talohan'ilay litera mangina ny vava",
      tonguePosture: "👅 Tsy mihetsika manao feo fanampiny ny lela",
      airflowGuide: "💨 Tapahana avy hatrany ny rivotra ao amin'ny feo marina farany",
      articulationStepsMg: [
        "1. Fantaro ireo litera mangina fampiasa amin'ny faran'ny teny frantsay (E, S, T, D, X).",
        "2. Aza asiana feo 'A' na 'I' na 'O' eo amin'ny farany (ohatra: 'Deux' -> 'Dø' fa tsy 'Deux-a').",
        "3. Ajanony tsara ny zava-panononana amin'ny feo neno farany."
      ],
      articulationStepsFr: [
        "1. Identifiez les lettres finales muettes (S, T, D, X, E pluriel).",
        "2. Ne rajoutez aucune voyelle parasite à la fin."
      ],
      commonMistakeMg: "Fanampiana voyelle amin'ny faran'ny teny frantsay (ohatra: 'Salut' -> 'Saluta', 'Deux' -> 'Deuxe').",
      commonMistakeFr: "Ajouter une voyelle parasite en fin de mot.",
      exampleWords: [
        { word: "Deux", phonetic: "dø", translationMg: "Roa", translationFr: "Deux" },
        { word: "Cents", phonetic: "sɑ̃", translationMg: "Zato", translationFr: "Cents" },
        { word: "Tomates", phonetic: "tɔmat", translationMg: "Voatabia", translationFr: "Tomates" },
        { word: "Salut", phonetic: "saly", translationMg: "Salama", translationFr: "Salut" }
      ]
    }
  };

  private challengingWords: Record<string, ChallengingWordDetail> = {
    "bonjour": {
      word: "Bonjour",
      phonetic: "bɔ̃ʒuʁ",
      phonemeCategory: "nasal_on",
      tipMg: "Tandremo ny feo 'ON' (orona) sy ny 'J' malefaka ary ny 'R' ao an-tenda.",
      tipFr: "Combinaison de la nasale 'ON', du 'J' doux et du 'R' guttural.",
      detailedGuideMg: "1. 'Bon' = nasal [ɔ̃] (tsy tononina ny N). 2. 'jour' = 'J' malefaka [ʒ] (tsy DZ) + 'OU' + 'R' am-tenda.",
      detailedGuideFr: "1. Nasale 'ON' fermée. 2. Consonne 'J' continue sans affrication. 3. 'R' guttural final.",
      commonPitfallMg: "Fanononana 'Bon-dzour' na fisoloana ny R ho R-roulé.",
      commonPitfallFr: "Prononcer un N audible ou affriquer le J en DZ."
    },
    "salut": {
      word: "Salut",
      phonetic: "saly",
      phonemeCategory: "sound_u",
      tipMg: "Ny 'U' dia boribory molotra (I am-bava, O amin'ny molotra). Mangina ny 'T' farany.",
      tipFr: "Son 'U' avec lèvres projetées en avant. Le 'T' final est muet.",
      detailedGuideMg: "1. 'Sa' = S madio. 2. 'lu' = U frantsay [y] (boriboroy ny molotra). 3. Mangina ny T.",
      detailedGuideFr: "1. Lèvres en cul-de-poule pour le 'U'. 2. Ne prononcez surtout pas le 'T' final.",
      commonPitfallMg: "Fanononana 'Salou' na fanampiana T amin'ny farany.",
      commonPitfallFr: "Prononcer 'Salou' ou faire entendre le 'T'."
    },
    "enchanté": {
      word: "Enchanté",
      phonetic: "ɑ̃ʃɑ̃te",
      phonemeCategory: "nasal_an",
      tipMg: "Ny 'EN' sy 'AN' dia samy feo avy amin'ny orona [ɑ̃]. Ny 'CH' dia 'chhh' malefaka.",
      tipFr: "Deux voyelles nasales identiques [ɑ̃] séparées par un 'CH' doux.",
      detailedGuideMg: "1. 'En' = [ɑ̃] vava misokatra, orona misokatra. 2. 'chan' = CH malefaka + [ɑ̃]. 3. 'té' = É mangilatra.",
      detailedGuideFr: "1. Nasale 'AN' ouverte. 2. CH continu sans T. 3. É fermé.",
      commonPitfallMg: "Fanononana 'An-tsan-té' miaraka amin'ny N sy TS.",
      commonPitfallFr: "Prononcer les N consonantiens ou transformer CH en TS."
    },
    "combien": {
      word: "Combien",
      phonetic: "kɔ̃bjɛ̃",
      phonemeCategory: "nasal_in",
      tipMg: "Ny 'COM' dia nasal [ɔ̃], ary ny 'BIEN' dia mifarana amin'ny nasal [ɛ̃].",
      tipFr: "Séquence de deux nasales : 'OM' [ɔ̃] puis 'IEN' [jɛ̃].",
      detailedGuideMg: "1. 'Com' = [kɔ̃]. 2. 'bien' = b + i + [ɛ̃] (orona mitsiky).",
      detailedGuideFr: "1. Nasale fermée 'OM'. 2. Semi-voyelle 'I' suivie de la nasale 'IN'.",
      commonPitfallMg: "Fanononana 'Kombien-ne' miaraka amin'ny N mafy.",
      commonPitfallFr: "Articuler les consonnes N."
    },
    "coûte": {
      word: "coûte",
      phonetic: "kut",
      phonemeCategory: "silent_final",
      tipMg: "Ny 'OU' dia fohy [u]. Mangina ny 'E' amin'ny farany.",
      tipFr: "Le son 'OU' est net et court. Le 'E' final ne se prononce pas.",
      detailedGuideMg: "1. 'coû' = K + OU. 2. 'te' = T fohy, tsy asiana E amin'ny farany.",
      detailedGuideFr: "1. Voyelle orale 'OU'. 2. Consonne 'T' nette sans 'E' parasite.",
      commonPitfallMg: "Fanampiana E na A amin'ny farany (coûta).",
      commonPitfallFr: "Ajouter une voyelle finale."
    },
    "cher": {
      word: "cher",
      phonetic: "ʃɛʁ",
      phonemeCategory: "sound_ch_j",
      tipMg: "Ny 'CH' dia malefaka (chhh) ary tononina ny 'R' am-tenda amin'ny farany.",
      tipFr: "Attaque par un 'CH' doux suivi d'un 'È' ouvert et du 'R' final.",
      detailedGuideMg: "1. 'CH' = chhh. 2. 'ER' = È + R am-tenda.",
      detailedGuideFr: "1. CH continu. 2. R guttural sonore.",
      commonPitfallMg: "Fanononana 'Tser'.",
      commonPitfallFr: "Affriquer en TS."
    },
    "droite": {
      word: "droite",
      phonetic: "dʁwat",
      phonemeCategory: "sound_oi",
      tipMg: "Ny 'OI' dia tononina 'WA'. Tononina ny 'T' fa mangina ny 'E' farany.",
      tipFr: "Combinaison 'OI' [wa]. Le 'T' s'entend mais pas le 'E'.",
      detailedGuideMg: "1. 'dr' = D + R am-tenda. 2. 'oi' = WA. 3. 'te' = T snap.",
      detailedGuideFr: "1. Groupe DR. 2. Diphtongue WA. 3. T final net.",
      commonPitfallMg: "Fanononana 'Droit-a'.",
      commonPitfallFr: "Séparer le O et le I."
    },
    "gauche": {
      word: "gauche",
      phonetic: "ɡoʃ",
      phonemeCategory: "sound_ch_j",
      tipMg: "Ny 'AU' dia 'O' mikatona. Ny 'CH' dia 'chhh' malefaka.",
      tipFr: "Le digramme 'AU' donne un 'O' fermé, suivi du 'CH' doux.",
      detailedGuideMg: "1. 'G' = G mafy (ga). 2. 'au' = O. 3. 'che' = CH (chhh).",
      detailedGuideFr: "1. G dur. 2. O fermé. 3. CH doux.",
      commonPitfallMg: "Fanononana 'Gotsa'.",
      commonPitfallFr: "Prononcer AU comme A-U."
    },
    "monsieur": {
      word: "monsieur",
      phonetic: "məsjø",
      phonemeCategory: "sound_eu",
      tipMg: "Fanononana miavaka: tononina hoe 'me-syeu' [məsjø] miaraka amin'ny 'EU' boribory molotra.",
      tipFr: "Prononciation irrégulière : dites 'me-sieu' avec le 'EU' fermé.",
      detailedGuideMg: "1. 'mon' -> 'me' [mə]. 2. 'sieur' -> s + i + EU [jø].",
      detailedGuideFr: "1. Syllabe initiale 'me'. 2. Finale 'sieur' avec EU fermé.",
      commonPitfallMg: "Fanononana 'Mon-sioer' ara-tsipelina.",
      commonPitfallFr: "Prononcer selon l'orthographe 'Mon-sieur'."
    },
    "deux": {
      word: "deux",
      phonetic: "dø",
      phonemeCategory: "sound_eu",
      tipMg: "Feo 'EU' [ø] boribory molotra. Mangina tanteraka ny 'X' farany.",
      tipFr: "Son 'EU' fermé avec lèvres projetées. Le 'X' final est muet.",
      detailedGuideMg: "1. 'D' = D madio. 2. 'eux' = EU boribory (aza misy X).",
      detailedGuideFr: "1. D dentaire. 2. EU fermé. 3. Ne faites pas entendre le X.",
      commonPitfallMg: "Fanononana 'Deuks' na 'Dou'.",
      commonPitfallFr: "Prononcer le X final."
    },
    "cinq": {
      word: "cinq",
      phonetic: "sɛ̃k",
      phonemeCategory: "nasal_in",
      tipMg: "Ny 'CIN' dia nasal [ɛ̃] mitsiky, ary tononina am-bava toy ny 'K' ny 'Q'.",
      tipFr: "Nasale 'IN' [ɛ̃] suivie du son 'K' pour le 'Q' final.",
      detailedGuideMg: "1. 'cin' = nasal [ɛ̃]. 2. 'q' = K kely mangilatra.",
      detailedGuideFr: "1. Nasale IN. 2. K final sec.",
      commonPitfallMg: "Fanononana 'Sink'.",
      commonPitfallFr: "Omettre le K final."
    },
    "cents": {
      word: "cents",
      phonetic: "sɑ̃",
      phonemeCategory: "silent_final",
      tipMg: "Mangina ny 'TS' amin'ny farany. Ny 'EN' ihany no re [sɑ̃].",
      tipFr: "Le 'TS' final est muet. Seule la nasale 'EN' résonne.",
      detailedGuideMg: "1. 'C' = S. 2. 'ents' = [ɑ̃] orona sisa, tapaho teo.",
      detailedGuideFr: "1. S initial. 2. Nasale AN. 3. Pas de TS.",
      commonPitfallMg: "Fanononana 'Sentse'.",
      commonPitfallFr: "Faire claquer le T et le S."
    },
    "tomates": {
      word: "tomates",
      phonetic: "tɔmat",
      phonemeCategory: "silent_final",
      tipMg: "Mangina ny 'ES' amin'ny farany. Ajanony amin'ny 'T' ny zava-panononana.",
      tipFr: "La terminaison '-es' du pluriel est totalement muette.",
      detailedGuideMg: "1. 'to' = TO. 2. 'ma' = MA. 3. 'tes' = T sisa.",
      detailedGuideFr: "1. Syllabes to-ma. 2. T final sec sans E.",
      commonPitfallMg: "Fanononana 'Tomatesa'.",
      commonPitfallFr: "Prononcer le ES."
    },
    "un": {
      word: "un",
      phonetic: "œ̃",
      phonemeCategory: "nasal_in",
      tipMg: "Voyelle nasale boribory molotra [œ̃]. Aza tononina ny 'N'.",
      tipFr: "Voyelle nasale spécifique. Ne prononcez pas le N.",
      detailedGuideMg: "1. Molotra boribory mipoitra. 2. Rivotra mivoaka amin'ny orona.",
      detailedGuideFr: "1. Nasale arrondie. 2. Pas de consonne N.",
      commonPitfallMg: "Fanononana 'Oune' na 'Inne'.",
      commonPitfallFr: "Prononcer la consonne N."
    },
    "ariary": {
      word: "Ariary",
      phonetic: "aʁjaʁi",
      phonemeCategory: "sound_r",
      tipMg: "Teny malagasy amin'ny fiteny frantsay: ny 'R' dia tononina am-tenda frantsay.",
      tipFr: "Mot malgache prononcé avec le 'R' guttural français.",
      detailedGuideMg: "1. 'A' = A. 2. 'ri' = R am-tenda + I. 3. 'a' = A. 4. 'ry' = R am-tenda + I.",
      detailedGuideFr: "1. A initial. 2. R guttural doux.",
      commonPitfallMg: "Rouler trop fort le R malgache dans un contexte francophone.",
      commonPitfallFr: "Rouler la langue."
    }
  };

  public static getInstance(): PhoneticsService {
    if (!PhoneticsService.instance) {
      PhoneticsService.instance = new PhoneticsService();
    }
    return PhoneticsService.instance;
  }

  public getPhonemeGuide(id: string): PhonemeArticulationGuide | null {
    return this.phonemeGuides[id] || null;
  }

  public getAllPhonemeGuides(): PhonemeArticulationGuide[] {
    return Object.values(this.phonemeGuides);
  }

  public getWordDetail(word: string): ChallengingWordDetail | null {
    const cleanWord = word.trim().toLowerCase();
    if (this.challengingWords[cleanWord]) {
      return this.challengingWords[cleanWord];
    }

    // Dynamic pattern matcher if not explicitly in dictionary
    return this.inferWordDetail(cleanWord);
  }

  private inferWordDetail(word: string): ChallengingWordDetail | null {
    if (word.endsWith("es") || word.endsWith("ts") || word.endsWith("ds")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "silent_final",
        tipMg: "Mangina ny litera farany (ES, TS, DS). Ajanony teo amin'ny feo talohan'io.",
        tipFr: "Lettres finales muettes. Ne prononcez pas la terminaison.",
      };
    }
    if (word.includes("ou")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "silent_final",
        tipMg: "Ny 'OU' dia feo 'ou' fohy sady mazava [u].",
        tipFr: "Le son 'OU' est une voyelle fermée courte et nette.",
      };
    }
    if (word.includes("eu") || word.includes("œu")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "sound_eu",
        tipMg: "Ny 'EU' dia tononina amin'ny lela amin'ny 'É' sy molotra amin'ny 'O' [ø].",
        tipFr: "Son 'EU' fermé : position du É avec lèvres du O.",
      };
    }
    if (word.includes("an") || word.includes("en")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "nasal_an",
        tipMg: "Ny 'AN/EN' dia feo avy amin'ny orona [ɑ̃]. Tsy tononina ny N.",
        tipFr: "Voyelle nasale 'AN/EN'. Ne pas articuler le N.",
      };
    }
    if (word.includes("on")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "nasal_on",
        tipMg: "Ny 'ON' dia feo avy amin'ny orona [ɔ̃]. Tsy tononina ny N.",
        tipFr: "Voyelle nasale 'ON'. Lèvres très arrondies.",
      };
    }
    if (word.includes("in") || word.includes("ain") || word.includes("ein")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "nasal_in",
        tipMg: "Ny 'IN/AIN' dia feo avy amin'ny orona mitsiky [ɛ̃].",
        tipFr: "Voyelle nasale 'IN/AIN'. Lèvres légèrement étirées.",
      };
    }
    if (word.includes("ch") || word.startsWith("j") || word.startsWith("g")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "sound_ch_j",
        tipMg: "Ny 'CH' na 'J' dia malefaka (chhh/zhhh). Tsy tononina 'TS' na 'DZ'.",
        tipFr: "Sons chuintants continus sans blocage de langue.",
      };
    }
    if (word.includes("r")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "sound_r",
        tipMg: "Ny 'R' frantsay dia ao an-tenda no amoahana azy.",
        tipFr: "Prononcez le 'R' à l'arrière de la gorge.",
      };
    }
    if (word.includes("u")) {
      return {
        word,
        phonetic: "...",
        phonemeCategory: "sound_u",
        tipMg: "Ny 'U' dia boribory molotra (lele amin'ny 'I', molotra amin'ny 'O').",
        tipFr: "Tendez les lèvres en avant pour former le 'U'.",
      };
    }
    return null;
  }

  public highlightPhoneticWords(text: string, isMg: boolean): string {
    if (!text) return "";

    const wordKeys = Object.keys(this.challengingWords);
    // Sort descending by length
    const sortedKeys = [...wordKeys].sort((a, b) => b.length - a.length);

    let result = text;
    sortedKeys.forEach(key => {
      const detail = this.challengingWords[key];
      const escaped = detail.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b(${escaped})\\b`, 'gi');

      const tip = isMg ? detail.tipMg : detail.tipFr;

      result = result.replace(regex, (match) => {
        return `<span class="fz-phonetic-highlight cursor-pointer inline-flex items-center gap-0.5 border-b-2 border-indigo-400/80 bg-indigo-50/50 px-1.5 py-0.5 rounded-md hover:bg-indigo-100 hover:border-indigo-600 transition-all text-slate-900 font-extrabold group/tooltip" data-word="${match}" data-phonetic="${detail.phonetic}" data-category="${detail.phonemeCategory}" data-tip="${tip}">
          ${match}
          <span class="text-[9px] ml-0.5 text-indigo-500 opacity-70 group-hover/tooltip:opacity-100 transition-opacity">🎙️</span>
        </span>`;
      });
    });

    return result;
  }

  public renderArticulationTooltip(
    word: string,
    phonetic: string,
    tip: string,
    categoryKey: string,
    isMg: boolean,
    onPlayAudio: () => void
  ): HTMLElement {
    const tooltip = document.createElement("div");
    tooltip.id = "fz-phonetic-tooltip";
    tooltip.className = "absolute z-50 bg-slate-950 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex flex-col gap-3 max-w-[280px] sm:max-w-[320px] text-left animate-fade-in pointer-events-auto font-sans";

    const detail = this.getWordDetail(word);
    const category = categoryKey ? this.getPhonemeGuide(categoryKey) : (detail ? this.getPhonemeGuide(detail.phonemeCategory) : null);

    const title = category ? (isMg ? category.titleMg : category.titleFr) : (isMg ? "Torolalana amin'ny Fanononana" : "Guide d'articulation");
    const lipInfo = category?.lipPosture || "";
    const tongueInfo = category?.tonguePosture || "";
    const mistake = detail?.commonPitfallMg || category?.commonMistakeMg || "";

    tooltip.innerHTML = `
      <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-sm text-indigo-400 font-mono tracking-tight">${word}</span>
          <span class="text-[10px] text-amber-300 font-bold font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-amber-400/20">[${phonetic || detail?.phonetic || "..."}]</span>
        </div>
        <button id="fz-tooltip-close-btn" class="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors">✕</button>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs text-slate-200 leading-snug font-medium">${tip}</p>

        ${category ? `
          <div class="bg-slate-900/90 rounded-xl p-2.5 border border-indigo-500/20 flex flex-col gap-1.5 text-[11px] text-slate-300">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
              <span>👄</span> ${title}
            </span>
            ${lipInfo ? `<div class="text-[11px] leading-tight text-slate-200">${lipInfo}</div>` : ""}
            ${tongueInfo ? `<div class="text-[11px] leading-tight text-slate-200">${tongueInfo}</div>` : ""}
          </div>
        ` : ""}

        ${mistake ? `
          <div class="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2 text-[10px] text-amber-200 leading-tight">
            <strong>⚠️ ${isMg ? "Fahadisoana matetika" : "Erreur fréquente"} :</strong> ${mistake}
          </div>
        ` : ""}
      </div>

      <div class="flex items-center gap-2 mt-1">
        <button id="fz-tooltip-play-btn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95">
          <span>🔊</span>
          <span>${isMg ? "Hihaino ny feo" : "Écouter le son"}</span>
        </button>

        ${category ? `
          <button id="fz-tooltip-more-btn" class="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-400/30 font-bold py-2 px-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95" title="${isMg ? "Zava-panononana feno" : "Guide complet"}">
            <span>💡</span>
          </button>
        ` : ""}
      </div>
    `;

    // Event handlers
    tooltip.querySelector("#fz-tooltip-close-btn")?.addEventListener("click", () => {
      tooltip.remove();
    });

    tooltip.querySelector("#fz-tooltip-play-btn")?.addEventListener("click", (evt) => {
      evt.stopPropagation();
      onPlayAudio();
    });

    tooltip.querySelector("#fz-tooltip-more-btn")?.addEventListener("click", (evt) => {
      evt.stopPropagation();
      this.showFullArticulationModal(categoryKey || detail?.phonemeCategory || "sound_u", isMg, onPlayAudio);
      tooltip.remove();
    });

    return tooltip;
  }

  public showFullArticulationModal(categoryId: string, isMg: boolean, onPlayAudio: () => void): void {
    const category = this.getPhonemeGuide(categoryId) || this.phonemeGuides["sound_u"];
    if (!category) return;

    const existingModal = document.getElementById("fz-articulation-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "fz-articulation-modal";
    modal.className = "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans";

    const steps = isMg ? category.articulationStepsMg : category.articulationStepsFr;
    const title = isMg ? category.titleMg : category.titleFr;
    const contrast = isMg ? category.malagasyContrastMg : category.malagasyContrastFr;
    const mistake = isMg ? category.commonMistakeMg : category.commonMistakeFr;

    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <!-- Close button -->
        <button id="fz-modal-close-btn" class="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all">✕</button>

        <!-- Header -->
        <div class="flex items-center gap-3 border-b border-slate-800 pb-4 pr-8">
          <div class="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-2xl">
            🎙️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">${category.symbol}</span>
              <span class="text-[10px] font-mono text-slate-400">${category.frenchPattern}</span>
            </div>
            <h3 class="text-lg font-extrabold text-white mt-0.5 tracking-tight">${title}</h3>
          </div>
        </div>

        <!-- Malagasy Contrast Box -->
        <div class="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 text-xs leading-relaxed text-indigo-100">
          <div class="font-extrabold text-indigo-400 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>🇲🇬</span> ${isMg ? "Fampitahana amin'ny teny Malagasy" : "Spécificité pour les Malgachophones"}
          </div>
          <p>${contrast}</p>
        </div>

        <!-- Physical Posture Guide -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-slate-950/60 rounded-2xl p-3 border border-slate-800 flex flex-col gap-1">
            <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">${category.lipPosture.split(' ')[0]} ${isMg ? "Molotra" : "Lèvres"}</span>
            <span class="text-xs font-semibold text-slate-200">${category.lipPosture.replace(/^[^\s]+\s*/, '')}</span>
          </div>
          <div class="bg-slate-950/60 rounded-2xl p-3 border border-slate-800 flex flex-col gap-1">
            <span class="text-[10px] font-bold text-sky-400 uppercase tracking-wider">${category.tonguePosture.split(' ')[0]} ${isMg ? "Lela" : "Langue"}</span>
            <span class="text-xs font-semibold text-slate-200">${category.tonguePosture.replace(/^[^\s]+\s*/, '')}</span>
          </div>
        </div>

        <!-- Step-by-Step Articulation -->
        <div class="flex flex-col gap-2">
          <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>👣</span> ${isMg ? "Dingana 3 amin'ny fanononana" : "3 étapes d'articulation"}
          </h4>
          <div class="flex flex-col gap-2">
            ${steps.map(step => `
              <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-xs font-medium text-slate-200 leading-normal">
                ${step}
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Common Mistake Warning -->
        <div class="bg-amber-950/50 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200 flex flex-col gap-1">
          <span class="font-extrabold text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <span>⚠️</span> ${isMg ? "Fahadisoana matetika tsy maintsy sorohina" : "Piège fréquent à éviter"}
          </span>
          <p>${mistake}</p>
        </div>

        <!-- Example Audio Cards -->
        <div class="flex flex-col gap-2 mt-1">
          <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>🔊</span> ${isMg ? "Ohatra azo henoina" : "Exemples sonores"}
          </h4>
          <div class="grid grid-cols-2 gap-2">
            ${category.exampleWords.map(ex => `
              <button class="fz-modal-example-play-btn bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-2.5 text-left transition-all flex items-center justify-between group cursor-pointer" data-word="${ex.word}">
                <div>
                  <div class="font-bold text-xs text-white group-hover:text-indigo-300 transition-colors">${ex.word} <span class="text-[10px] font-mono text-slate-400">[${ex.phonetic}]</span></div>
                  <div class="text-[10px] text-slate-400">${isMg ? ex.translationMg : ex.translationFr}</div>
                </div>
                <span class="text-xs opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all">🔊</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector("#fz-modal-close-btn")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelectorAll(".fz-modal-example-play-btn").forEach((btn: any) => {
      btn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        const word = btn.getAttribute("data-word");
        if (word && (window as any).feheziko?.audio) {
          (window as any).feheziko.audio.speakFrench(word);
        } else {
          onPlayAudio();
        }
      });
    });
  }
}

export const phoneticsService = PhoneticsService.getInstance();
