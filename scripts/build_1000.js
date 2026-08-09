const fs = require('fs');
const path = require('path');

const dict = [];
const seen = new Set();

function add(word, type, translation, definition, example_fr, example_mg) {
  if (!word || !translation) return;
  const key = word.toLowerCase().trim();
  if (seen.has(key)) return;
  seen.add(key);
  dict.push({
    word: word.trim(),
    type: type.trim(),
    translation: translation.trim(),
    definition: definition.trim(),
    example_fr: example_fr.trim(),
    example_mg: example_mg.trim()
  });
}

// Data generator arrays
const rawData = [
  // 1. Salutations & Interjections
  ["Bonjour", "interj.", "Manao ahoana (maraina/andro)", "Formule de salutation polie utilisée pendant la journée.", "Bonjour, comment allez-vous ?", "Manao ahoana, manao ahoana ny fahasalamanao ?"],
  ["Bonsoir", "interj.", "Manao ahoana (hariva)", "Salutation adressée en fin de journée.", "Bonsoir tout le monde !", "Manao ahoana ianareo rehetra !"],
  ["Au revoir", "locution", "Veloma", "Formule pour prendre congé.", "Au revoir et à bientôt !", "Veloma ary hita indray !"],
  ["Merci", "interj.", "Misaotra", "Expression de gratitude.", "Merci beaucoup pour votre aide.", "Misaotra betsaka amin'ny fanampianao."],
  ["S'il vous plaît", "locution", "Azafady", "Formule de politesse.", "Un verre d'eau, s'il vous plaît.", "Rano iray vera, azafady."],
  ["Pardon", "interj.", "Azafady / Pardon", "Demande d'excuse.", "Pardon, je ne voulais pas vous déranger.", "Pardon, tsy te-hanelingelina anao aho."],
  ["De rien", "locution", "Tsy misy fisaorana", "Réponse à un remerciement.", "Merci ! - De rien.", "Misaotra ! - Tsy misy fisaorana."],
  ["Excusez-moi", "locution", "Azafady indrindra", "Formule pour s'excuser.", "Excusez-moi, où est la poste ?", "Azafady indrindra, aiza ny posta ?"],
  ["Bienvenue", "interj.", "Tonga soa", "Accueil chaleureux.", "Soyez le bienvenu chez nous !", "Tonga soa eto aminay ianao !"],
  ["À bientôt", "locution", "Hita indray miaraka", "Formule de revoir.", "Bonne journée et à bientôt !", "Mirary andro finaritra ary hita indray !"],
  ["À demain", "locution", "Mandra-pampitso", "Salutation pour le lendemain.", "Au revoir, à demain !", "Veloma, mandra-pampitso !"],
  ["Félicitations", "n.f.pl.", "Arahaba / Arahabaina", "Compliments pour un succès.", "Félicitations pour votre réussite !", "Arahabaina amin'ny fahombiazanao !"],
  ["Santé", "n.f.", "Fahasalamana", "État de bien-être physique.", "Bonne santé à vous !", "Fahasalamana tsara ho anao !"],
  ["D'accord", "locution", "Eny ary / Mety izany", "Accord ou consentement.", "D'accord, nous ferons comme ça.", "Eny ary, hanao toy izany isika."],
  ["Bien sûr", "locution", "Azo antoka", "Expression d'évidence.", "Bien sûr que je serai présent !", "Azo antoka fa ho avy aho !"],
  ["Pas de problème", "locution", "Tsy misy olana", "Absence de difficulté.", "Pas de problème pour la livraison.", "Tsy misy olana amin'ny fampidirana."],
  ["Bon courage", "locution", "Mahazatà / Mahereza", "Souhait d'énergie.", "Bon courage pour votre travail !", "Mahereza amin'ny asanao !"],
  ["Bonne chance", "locution", "Tsara vintana", "Souhait de succès.", "Bonne chance pour ton examen !", "Tsara vintana amin'ny fanadinanao !"],
  ["Bon appétit", "locution", "Mazotoa homana", "Souhait avant de manger.", "Bon appétit à tous !", "Mazotoa homana ianareo rehetra !"],
  ["Enchanté", "adj.", "Faly mahafantatra anao", "Politesse lors d'une rencontre.", "Enchanté de vous rencontrer.", "Faly mahafantatra anao aho."],
  ["Oui", "adv.", "Eny", "Affirmation.", "Oui, j'accepte.", "Eny, ekenko."],
  ["Non", "adv.", "Tsia", "Négation.", "Non, je refuse.", "Tsia, laviko."],
  ["Peut-être", "adv.", "Mety ho", "Doute ou possibilité.", "Peut-être qu'il viendra.", "Mety ho avy izy."],
  ["C'est vrai", "locution", "Marina izany", "Affirmation de vérité.", "C'est vrai, c'est exact.", "Marina izany, marina be."],
  ["C'est faux", "locution", "Diso izany", "Déclaration d'erreur.", "C'est faux, ce n'est pas vrai.", "Diso izany, tsy marina."],
  ["Allô", "interj.", "Alô", "Salutation au téléphone.", "Allô, qui est à l'appareil ?", "Alô, iza izany miantso izany ?"],
  ["Bravo", "interj.", "Tsara be / Arahaba", "Applaudissement oral.", "Bravo pour cette performance !", "Tsara be izany fanaovana izany !"],
  ["Attention", "interj.", "Mitandrema", "Mise en garde.", "Attention au chien !", "Mitandrema amin'ny alika !"],
  ["Au secours", "interj.", "Vonjeo", "Appel de détresse.", "Au secours, aidez-moi !", "Vonjeo, ampion aho !"],
  ["Dommage", "n.m.", "Mampalahelo / Anina", "Regret pour un fait.", "C'est dommage qu'il ne soit pas venu.", "Mampalahelo fa tsy avy izy."]
];

rawData.forEach(r => add(...r));
console.log("Current dictionary items count:", dict.length);
