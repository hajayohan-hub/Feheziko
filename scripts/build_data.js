const fs = require('fs');

// Generator helper that produces high quality structured items
function createWord(word, type, translation, definition, example_fr, example_mg) {
  return { word, type, translation, definition, example_fr, example_mg };
}

const list = [
  // --- 1. Salutations & Base ---
  createWord("Bonjour", "interj.", "Manao ahoana (maraina/andro)", "Formule de salutation polie utilisée pendant la journée.", "Bonjour, comment allez-vous ?", "Manao ahoana, manao ahoana ny fahasalamanao ?"),
  createWord("Merci", "interj.", "Misaotra", "Expression de la gratitude ou du remerciement.", "Merci beaucoup pour votre aide.", "Misaotra betsaka amin'ny fanampianao."),
  createWord("S'il vous plaît", "locution", "Azafady", "Formule de politesse pour demander quelque chose.", "Un verre d'eau, s'il vous plaît.", "Rano iray vera, azafady."),
  createWord("Argent", "n.m.", "Vola", "Moyen d'échange, pièces ou billets de banque.", "Je n'ai pas assez d'argent.", "Tsy manana vola ampy aho."),
  createWord("Marché", "n.m.", "Tsena", "Lieu public où l'on vend et achète des marchandises.", "Je vais au marché acheter des fruits.", "Handeha any an-tsena hividy voankazo aho."),
  createWord("Travail", "n.m.", "Asa", "Activité professionnelle rémunérée.", "Il aime son travail à Antananarivo.", "Tia ny asany any Antananarivo izy."),
  createWord("Manger", "v.", "Mihinana", "Prendre de la nourriture pour s'alimenter.", "Nous allons manger ensemble ce midi.", "Hiaraka hisakafo isika anio antoandro."),
  createWord("Ami", "n.", "Namana", "Personne avec qui l'on a une relation d'affection.", "C'est mon meilleur ami.", "Izy no namako akaiky indrindra."),
  createWord("E-mail", "n.m.", "Taratasy elektronika (e-mail)", "Courrier électronique échangé sur un réseau informatique.", "Je vous ai envoyé un e-mail ce matin.", "Nalefako e-mail ianao izao maraina izao."),
  createWord("Projet", "n.m.", "Tetikasa", "Idée ou plan élaboré pour réaliser une action future.", "Notre projet avance très bien.", "Miroso tsara ny tetikasantsika."),
  createWord("Entreprise", "n.f.", "Orinasa / Barotra", "Organisation économique produisant des biens ou services.", "L'entreprise embauche de nouveaux diplômés.", "Mampiditra mpiasa diplaoma vaovao ny orinasa."),
  createWord("Chambre", "n.f.", "Efitrano", "Pièce d'une habitation destinée au logement ou au sommeil.", "J'ai réservé une chambre pour deux nuits.", "Namandrika efitrano ho an'ny roa alina aho."),
  createWord("Hôtel", "n.m.", "Hotely", "Établissement commercial qui offre un hébergement payant.", "L'hôtel se trouve près du centre-ville.", "Ao akaikin'ny afovoan-tànana ny hotely."),
  createWord("Voyage", "n.m.", "Dia", "Déplacement que l'on fait d'un lieu à un autre éloigné.", "Bon voyage à Antsirabe !", "Tafatsangana soa amin'ny dia mankany Antsirabe!"),
  createWord("Pharmacie", "n.f.", "Farmasia / Trano fanafody", "Officine où l'on prépare et vend des médicaments.", "La pharmacie est ouverte même le dimanche.", "Misokatra na amin'ny Alahady aza ny farmasia."),
  createWord("Médecin", "n.m.", "Mpitsabo / Dokotera", "Professionnel de santé habilité à diagnostiquer et traiter les maladies.", "Le médecin a prescrit un sirop pour la toux.", "Nomen'ny dokotera siro ho an'ny kohaka izy."),
  createWord("Fièvre", "n.f.", "Sondro-panethana / Mafana", "Élévation de la température du corps au-dessus de la normale.", "L'enfant a un peu de fièvre.", "Mafana kely ny zaza."),
  createWord("Voiture", "n.f.", "Fiara", "Véhicule automobile servant au transport des personnes.", "Nous voyageons en voiture de location.", "Mitety tany amin'ny fiara hofaina izahay."),
  createWord("Riz", "n.m.", "Vary", "Céréale constituant l'aliment de base à Madagascar.", "Le riz est servi à chaque repas.", "Misy vary hatrany amin'ny sakafo rehetra."),
  createWord("Eau", "n.f.", "Rano", "Liquide transparent indispensable à la vie.", "Apportez une bouteille d'eau minerale.", "Ento ny tavoahangy rano mineraly."),
  createWord("Maison", "n.f.", "Trano", "Bâtiment servant d'habitation aux personnes.", "La maison est située près de la grande route.", "Miorina akaikin'ny lálana lehibe ny trano."),
  createWord("Famille", "n.f.", "Fianakaviana", "Ensemble des personnes unies par des liens de parenté.", "Toute la famille se réunit le dimanche.", "Mivory ny fianakaviana iray manontolo amin'ny Alahady."),
  createWord("Téléphone", "n.m.", "Finday", "Appareil de communication sans fil ou fixe.", "Mon téléphone n'a plus de batterie.", "Tsy misy vato intsony ny findaiko."),
  createWord("Livre", "n.m.", "Boky", "Assemblage de feuilles imprimées formant un ouvrage.", "J'ai emprunté un livre à la bibliothèque.", "Nindrana boky ao amin'ny trano famakiam-boky aho."),
  createWord("École", "n.f.", "Sekoly", "Établissement où l'on dispense l'enseignement.", "Les enfants vont à l'école le matin.", "Mandeha any an-tsekoly maraina ny ankizy."),
  createWord("Aujourd'hui", "adv.", "Androany", "Le jour présent dans lequel nous sommes.", "Quel est le programme pour aujourd'hui ?", "Inona no fandaharana ho an'androany?"),
  createWord("Demain", "adv.", "Ampitso", "Le jour immédiatement après aujourd'hui.", "Le rendez-vous est fixé pour demain matin.", "Karakaraina ho ampitso maraina ny fotoana."),
  createWord("Heure", "n.f.", "Ora / Fotoana", "Unité de mesure du temps égale à soixante minutes.", "À quelle heure commence la réunion ?", "Amin'ny firy ora no manomboka ny fivoriana?"),
  createWord("Route", "n.f.", "Lálana", "Voie de communication carrossable aménagée hors des agglomérations.", "La route nationale est très fréquentée.", "Be mpampiasa ny lálana nasionaly."),
  createWord("Réunion", "n.f.", "Fivoriana", "Rassemblement de personnes pour discuter d'un sujet.", "La réunion débutera à neuf heures précises.", "Hanonboka amin'ny tsara amin'ny sivy ora ny fivoriana."),
  createWord("Fichier", "n.m.", "Rakitra / Dosie", "Ensemble d'informations numérisées enregistrées sur un support.", "Je vous envoie le fichier par e-mail.", "Alefako e-mail aminao ny rakitra."),
  createWord("Acheter", "v.", "Mividy / Hividy", "Acquérir un bien ou service contre paiement.", "Je vais acheter du pain au marché.", "Handeha hividy mofo any an-tsena aho."),
  createWord("Payer", "v.", "Mandoa vola", "Donner de l'argent en échange d'un bien ou d'un service.", "Vous pouvez payer par carte bancaire ou en espèces.", "Afaka mandoa vola amin'ny karatra na amin'ny vola tanana ianao."),
  createWord("Comprendre", "v.", "Mahazo / Mazava", "Saisir le sens de quelque chose par l'esprit.", "Est-ce que vous comprenez la phrase en malgache ?", "Azonao ve ny fehezanteny amin'ny teny malagasy?"),

  // Additional Salutations & Courtesy
  createWord("Bonsoir", "interj.", "Manao ahoana (hariva)", "Salutation du soir.", "Bonsoir tout le monde !", "Manao ahoana ianareo rehetra !"),
  createWord("Au revoir", "locution", "Veloma", "Formule pour prendre congé.", "Au revoir et à bientôt !", "Veloma ary hita indray !"),
  createWord("Pardon", "interj.", "Azafady / Pardon", "Demande d'excuse.", "Pardon, je ne voulais pas vous déranger.", "Pardon, tsy te-hanelingelina anao aho."),
  createWord("De rien", "locution", "Tsy misy fisaorana", "Réponse polie à un remerciement.", "Merci ! - De rien.", "Misaotra ! - Tsy misy fisaorana."),
  createWord("Excusez-moi", "locution", "Azafady indrindra", "Formule pour capter l'attention ou s'excuser.", "Excusez-moi, où est la banque ?", "Azafady indrindra, aiza ny banky ?"),
  createWord("Bienvenue", "interj.", "Tonga soa", "Accueil chaleureux adressé à un visiteur.", "Soyez le bienvenu chez nous !", "Tonga soa eto aminay ianao !"),
  createWord("À bientôt", "locution", "Hita indray miaraka", "Formule d'adieu pour un revoir prochain.", "Bonne journée et à bientôt !", "Mirary andro finaritra ary hita indray !"),
  createWord("À demain", "locution", "Mandra-pampitso", "Salutation pour se revoir le lendemain.", "Au revoir, à demain !", "Veloma, mandra-pampitso !"),
  createWord("Félicitations", "n.f.pl.", "Arahaba / Arahabaina", "Compliments adressés pour un succès.", "Félicitations pour votre réussite !", "Arahabaina amin'ny fahombiazanao !"),
  createWord("Santé", "n.f.", "Fahasalamana", "État de bien-être physique et mental.", "Bonne santé à vous !", "Fahasalamana tsara ho anao !"),
  createWord("D'accord", "locution", "Eny ary / Mety izany", "Expression pour donner son consentement.", "D'accord, nous ferons comme ça.", "Eny ary, hanao toy izany isika."),
  createWord("Bien sûr", "locution", "Azo antoka / Mazava ho azy", "Expression marquant l'évidence.", "Bien sûr que je serai présent !", "Azo antoka fa ho avy aho !"),
  createWord("Pas de problème", "locution", "Tsy misy olana", "Expression assurant l'absence de difficulté.", "Je peux vous aider ? - Pas de problème.", "Afaka manampy anao ve aho ? - Tsy misy olana."),
  createWord("Bon courage", "locution", "Mahazatà / Mahereza", "Souhait d'énergie pour une tâche.", "Bon courage pour votre examen !", "Mahereza amin'ny fanadinanao !"),
  createWord("Bonne chance", "locution", "Tsara vintana", "Souhait de réussite.", "Bonne chance pour ton entretien !", "Tsara vintana amin'ny dinidinikao !"),
  createWord("Bon appétit", "locution", "Mazotoa homana", "Souhait formulé avant de manger.", "Le repas est servi, bon appétit !", "Karakaraina ny sakafo, mazotoa homana !"),
  createWord("Enchanté", "adj.", "Faly mahafantatra anao", "Expression polie de rencontre.", "Enchanté de faire votre connaissance.", "Faly mahafantatra anao aho."),
  createWord("Oui", "adv.", "Eny", "Affirmation.", "Oui, je suis d'accord.", "Eny, ekenko izany."),
  createWord("Non", "adv.", "Tsia", "Négation.", "Non, je ne peux pas venir.", "Tsia, tsy afaka avy aho."),
  createWord("Peut-être", "adv.", "Mety ho", "Expression de possibilité.", "Peut-être qu'il pleuvra demain.", "Mety ho avy ny rainay ampitso."),
  createWord("C'est vrai", "locution", "Marina izany", "Affirmation de vérité.", "C'est vrai, j'ai vu la scène.", "Marina izany, nahita ilay zavatra aho."),
  createWord("C'est faux", "locution", "Diso izany", "Déclaration d'inexactitude.", "C'est faux, ce n'est pas ce qui s'est passé.", "Diso izany, tsy izany no niseho.")
];

console.log("Current list length:", list.length);
