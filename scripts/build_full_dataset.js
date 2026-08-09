const fs = require('fs');
const path = require('path');

const words = [];
const seen = new Set();

function addWord(word, type, translation, definition, example_fr, example_mg) {
  if (!word || !translation) return;
  const key = word.toLowerCase().trim();
  if (seen.has(key)) return;
  seen.add(key);
  words.push({
    word: word.trim(),
    type: type.trim(),
    translation: translation.trim(),
    definition: definition.trim(),
    example_fr: example_fr.trim(),
    example_mg: example_mg.trim()
  });
}

// 1. Initial Core Vocabulary
const coreVocab = [
  ["Bonjour", "interj.", "Manao ahoana (maraina/andro)", "Formule de salutation polie utilisée pendant la journée.", "Bonjour, comment allez-vous ?", "Manao ahoana, manao ahoana ny fahasalamanao ?"],
  ["Merci", "interj.", "Misaotra", "Expression de la gratitude ou du remerciement.", "Merci beaucoup pour votre aide.", "Misaotra betsaka amin'ny fanampianao."],
  ["S'il vous plaît", "locution", "Azafady", "Formule de politesse pour demander quelque chose.", "Un verre d'eau, s'il vous plaît.", "Rano iray vera, azafady."],
  ["Argent", "n.m.", "Vola", "Moyen d'échange, pièces ou billets de banque.", "Je n'ai pas assez d'argent.", "Tsy manana vola ampy aho."],
  ["Marché", "n.m.", "Tsena", "Lieu public où l'on vend et achète des marchandises.", "Je vais au marché acheter des fruits.", "Handeha any an-tsena hividy voankazo aho."],
  ["Travail", "n.m.", "Asa", "Activité professionnelle rémunérée.", "Il aime son travail à Antananarivo.", "Tia ny asany any Antananarivo izy."],
  ["Manger", "v.", "Mihinana", "Prendre de la nourriture pour s'alimenter.", "Nous allons manger ensemble ce midi.", "Hiaraka hisakafo isika anio antoandro."],
  ["Ami", "n.", "Namana", "Personne avec qui l'on a une relation d'affection.", "C'est mon meilleur ami.", "Izy no namako akaiky indrindra."],
  ["E-mail", "n.m.", "Taratasy elektronika (e-mail)", "Courrier électronique échangé sur un réseau informatique.", "Je vous ai envoyé un e-mail ce matin.", "Nalefako e-mail ianao izao maraina izao."],
  ["Projet", "n.m.", "Tetikasa", "Idée ou plan élaboré pour réaliser une action future.", "Notre projet avance très bien.", "Miroso tsara ny tetikasantsika."],
  ["Entreprise", "n.f.", "Orinasa / Barotra", "Organisation économique produisant des biens ou services.", "L'entreprise embauche de nouveaux diplômés.", "Mampiditra mpiasa diplaoma vaovao ny orinasa."],
  ["Chambre", "n.f.", "Efitrano", "Pièce d'une habitation destinée au logement ou au sommeil.", "J'ai réservé une chambre pour deux nuits.", "Namandrika efitrano ho an'ny roa alina aho."],
  ["Hôtel", "n.m.", "Hotely", "Établissement commercial qui offre un hébergement payant.", "L'hôtel se trouve près du centre-ville.", "Ao akaikin'ny afovoan-tànana ny hotely."],
  ["Voyage", "n.m.", "Dia", "Déplacement que l'on fait d'un lieu à un autre éloigné.", "Bon voyage à Antsirabe !", "Tafatsangana soa amin'ny dia mankany Antsirabe!"],
  ["Pharmacie", "n.f.", "Farmasia / Trano fanafody", "Officine où l'on prépare et vend des médicaments.", "La pharmacie est ouverte même le dimanche.", "Misokatra na amin'ny Alahady aza ny farmasia."],
  ["Médecin", "n.m.", "Mpitsabo / Dokotera", "Professionnel de santé habilité à diagnostiquer et traiter les maladies.", "Le médecin a prescrit un sirop pour la toux.", "Nomen'ny dokotera siro ho an'ny kohaka izy."],
  ["Fièvre", "n.f.", "Sondro-panethana / Mafana", "Élévation de la température du corps au-dessus de la normale.", "L'enfant a un peu de fièvre.", "Mafana kely ny zaza."],
  ["Voiture", "n.f.", "Fiara", "Véhicule automobile servant au transport des personnes.", "Nous voyageons en voiture de location.", "Mitety tany amin'ny fiara hofaina izahay."],
  ["Riz", "n.m.", "Vary", "Céréale constituant l'aliment de base à Madagascar.", "Le riz est servi à chaque repas.", "Misy vary hatrany amin'ny sakafo rehetra."],
  ["Eau", "n.f.", "Rano", "Liquide transparent indispensable à la vie.", "Apportez une bouteille d'eau minerale.", "Ento ny tavoahangy rano mineraly."],
  ["Maison", "n.f.", "Trano", "Bâtiment servant d'habitation aux personnes.", "La maison est située près de la grande route.", "Miorina akaikin'ny lálana lehibe ny trano."],
  ["Famille", "n.f.", "Fianakaviana", "Ensemble des personnes unies par des liens de parenté.", "Toute la famille se réunit le dimanche.", "Mivory ny fianakaviana iray manontolo amin'ny Alahady."],
  ["Téléphone", "n.m.", "Finday", "Appareil de communication sans fil ou fixe.", "Mon téléphone n'a plus de batterie.", "Tsy misy vato intsony ny findaiko."],
  ["Livre", "n.m.", "Boky", "Assemblage de feuilles imprimées formant un ouvrage.", "J'ai emprunté un livre à la bibliothèque.", "Nindrana boky ao amin'ny trano famakiam-boky aho."],
  ["École", "n.f.", "Sekoly", "Établissement où l'on dispense l'enseignement.", "Les enfants vont à l'école le matin.", "Mandeha any an-tsekoly maraina ny ankizy."],
  ["Aujourd'hui", "adv.", "Androany", "Le jour présent dans lequel nous sommes.", "Quel est le programme pour aujourd'hui ?", "Inona no fandaharana ho an'androany?"],
  ["Demain", "adv.", "Ampitso", "Le jour immédiatement après aujourd'hui.", "Le rendez-vous est fixé pour demain matin.", "Karakaraina ho ampitso maraina ny fotoana."],
  ["Heure", "n.f.", "Ora / Fotoana", "Unité de mesure du temps égale à soixante minutes.", "À quelle heure commence la réunion ?", "Amin'ny firy ora no manomboka ny fivoriana?"],
  ["Route", "n.f.", "Lálana", "Voie de communication carrossable aménagée hors des agglomérations.", "La route nationale est très fréquentée.", "Be mpampiasa ny lálana nasionaly."],
  ["Réunion", "n.f.", "Fivoriana", "Rassemblement de personnes pour discuter d'un sujet.", "La réunion débutera à neuf heures précises.", "Hanonboka amin'ny tsara amin'ny sivy ora ny fivoriana."],
  ["Fichier", "n.m.", "Rakitra / Dosie", "Ensemble d'informations numérisées enregistrées sur un support.", "Je vous envoie le fichier par e-mail.", "Alefako e-mail aminao ny rakitra."],
  ["Acheter", "v.", "Mividy / Hividy", "Acquérir un bien ou service contre paiement.", "Je vais acheter du pain au marché.", "Handeha hividy mofo any an-tsena aho."],
  ["Payer", "v.", "Mandoa vola", "Donner de l'argent en échange d'un bien ou d'un service.", "Vous pouvez payer par carte bancaire ou en espèces.", "Afaka mandoa vola amin'ny karatra na amin'ny vola tanana ianao."],
  ["Comprendre", "v.", "Mahazo / Mazava", "Saisir le sens de quelque chose par l'esprit.", "Est-ce que vous comprenez la phrase en malgache ?", "Azonao ve ny fehezanteny amin'ny teny malagasy?"]
];

coreVocab.forEach(r => addWord(...r));

console.log("Core vocabulary added. Current total:", words.length);
