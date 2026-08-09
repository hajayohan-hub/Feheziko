const fs = require('fs');
const path = require('path');

// Base existing words
const existingWordsMap = new Map();

const frJson = JSON.parse(fs.readFileSync('./src/languages/fr.json', 'utf8'));
const baseList = frJson.dictionary || [];
baseList.forEach(item => {
  existingWordsMap.set(item.word.toLowerCase(), item);
});

// Comprehensive Vocabulary Generator for 1000 items
const additionalCategories = [
  // 1. Salutations & Expressions
  [
    ["Bonsoir", "interj.", "Manao ahoana (hariva)", "Salutation du soir.", "Bonsoir tout le monde !", "Manao ahoana ianareo rehetra !"],
    ["Au revoir", "locution", "Veloma", "Formule pour prendre congé.", "Au revoir et à bientôt !", "Veloma ary hita indray !"],
    ["Pardon", "interj.", "Azafady / Pardon", "Demande d'excuse.", "Pardon, je ne voulais pas vous déranger.", "Pardon, tsy te-hanelingelina anao aho."],
    ["De rien", "locution", "Tsy misy fisaorana", "Réponse polie à un remerciement.", "Merci ! - De rien.", "Misaotra ! - Tsy misy fisaorana."],
    ["Excusez-moi", "locution", "Azafady indrindra", "Formule pour capter l'attention ou s'excuser.", "Excusez-moi, où est la banque ?", "Azafady indrindra, aiza ny banky ?"],
    ["Bienvenue", "interj.", "Tonga soa", "Accueil chaleureux adressé à un visiteur.", "Soyez le bienvenu chez nous !", "Tonga soa eto aminay ianao !"],
    ["À bientôt", "locution", "Hita indray miaraka", "Formule d'adieu pour une revoir prochain.", "Bonne journée et à bientôt !", "Mirary andro finaritra ary hita indray !"],
    ["À demain", "locution", "Mandra-pampitso", "Salutation pour se revoir le lendemain.", "Au revoir, à demain !", "Veloma, mandra-pampitso !"],
    ["Félicitations", "n.f.pl.", "Arahaba / Arahabaina", "Compliments adressés pour un succès.", "Félicitations pour votre réussite !", "Arahabaina amin'ny fahombiazanao !"],
    ["Santé", "n.f.", "Fahasalamana", "État de bien-être physique et mental.", "Bonne santé à vous !", "Fahasalamana tsara ho anao !"]
  ],

  // 2. Famille & Personnes (Family & People)
  [
    ["Père", "n.m.", "Rai / Ray", "Parent masculin.", "Mon père travaille à la banque.", "Miasa ao amin'ny banky ny raiko."],
    ["Mère", "n.f.", "Reny", "Parent féminin.", "Ma mère cuisine très bien.", "Mahay mahandro tena tsara ny reniko."],
    ["Frère", "n.m.", "Anhoma / Rahalahy / Anadahy", "Membre masculin de la même fratrie.", "J'ai un frère plus âgé.", "Manana rahalahy zokiny kokoa aho."],
    ["Sœur", "n.f.", "Anhavavy / Rahavavy / Anabavy", "Membre féminin de la même fratrie.", "Ma sœur étudie à l'université.", "Mpianatra any amin'ny oniversite ny anabaviko."],
    ["Enfant", "n.", "Zaza / Anakiray", "Jeune être humain.", "L'enfant joue dans le jardin.", "Milalao ao an-jaridaina ny zaza."],
    ["Fils", "n.m.", "Zanakalahy", "Enfant de sexe masculin.", "Son fils a dix ans.", "Folo taona ny zanakalahiny."],
    ["Fille", "n.f.", "Zanakavavy", "Enfant de sexe féminin.", "Leur fille habite à Paris.", "Monina any Paris ny zanakavavin'izy ireo."],
    ["Grand-père", "n.m.", "Ôngy / Dadabe", "Père du père ou de la mère.", "Mon grand-père raconte de belles histoires.", "Mitantara tantara kanto ny dadabeko."],
    ["Grand-mère", "n.f.", "Bebe / Nenibe", "Mère du père ou de la mère.", "Ma grand-mère prépare du bon thé.", "Manao thé tsara ny nenibeko."],
    ["Oncle", "n.m.", "Mpanjaka / Tonton / Zama", "Frère du père ou de la mère.", "Mon oncle nous rend visite.", "Mamangy anay ny tontonko."],
    ["Tante", "n.f.", "Neny kely / Tata", "Sœur du père ou de la mère.", "Ma tante habite à Tamatave.", "Monina any Toamasina ny tatako."],
    ["Cousin", "n.m.", "Mpiray tampo / Cousin", "Fils de l'oncle ou de la tante.", "Mon cousin joue au football.", "Milalao baolina kitra ny cousinko."],
    ["Cousine", "n.f.", "Cousine", "Fille de l'oncle ou de la tante.", "Ma cousine aime la musique.", "Tia mozika ny cousine-ko."],
    ["Mari", "n.m.", "Vady lahy", "Homme uni par le mariage.", "Son mari est professeur.", "Mpamorona / Mpampianatra ny vadiny."],
    ["Femme", "n.f.", "Vady vavy / Vehivavy", "Personne adulte de sexe féminin ou épouse.", "Sa femme travaille à l'hôpital.", "Miasa ao amin'ny hopitaly ny vadiny."],
    ["Bébé", "n.m.", "Zazakely", "Très jeune enfant.", "Le bébé dort paisiblement.", "Matory am-pimonina ny zazakely."],
    ["Parents", "n.m.pl.", "Rai amandreny / Ray aman-dreny", "Le père et la mère.", "Mes parents habitent à la campagne.", "Monina any ambanivohitra ny ray aman-dreniko."],
    ["Voisin", "n.m.", "Mpiray vodirindrina / Mpifannoloka", "Personne qui habite à côté.", "Notre voisin est très aimable.", "Tena mahafinaritra ny mpifannoloka aminay."],
    ["Homme", "n.m.", "Lahy / Lehilahy", "Être humain adulte de sexe masculin.", "Cet homme est très cultivé.", "Tena manam-pahaizana io lehilahy io."],
    ["Garçon", "n.m.", "Zazalahy", "Jeune homme ou enfant masculin.", "Le garçon court très vite.", "Mihazakazaka haingana be ilay zazalahy."]
  ]
];

console.js = console.log;
console.log("Categories initialized.");
