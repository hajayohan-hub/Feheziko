import json

# Comprehensive dataset builder for French-Malagasy dictionary (1000 words)

words = []
seen = set()

def add(w, t, tr, df, e_fr, e_mg):
    key = w.lower().strip()
    if key in seen or not w or not tr:
        return
    seen.add(key)
    words.append({
        "word": w.strip(),
        "type": t.strip(),
        "translation": tr.strip(),
        "definition": df.strip(),
        "example_fr": e_fr.strip(),
        "example_mg": e_mg.strip()
    })

# Load base 34 words from fr.json
with open('src/languages/fr.json', 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

for item in fr_data.get('dictionary', []):
    add(item['word'], item['type'], item['translation'], item['definition'], item['example_fr'], item['example_mg'])

# 1. Salutations, Expressions & Politesse
dataset_1 = [
    ("Bonsoir", "interj.", "Manao ahoana (hariva)", "Salutation polie adressée en fin de journée.", "Bonsoir tout le monde !", "Manao ahoana ianareo rehetra !"),
    ("Au revoir", "locution", "Veloma", "Formule pour prendre congé.", "Au revoir et à bientôt !", "Veloma ary hita indray !"),
    ("Pardon", "interj.", "Azafady / Pardon", "Demande d'excuse polie.", "Pardon, je ne voulais pas vous déranger.", "Pardon, tsy te-hanelingelina anao aho."),
    ("De rien", "locution", "Tsy misy fisaorana", "Réponse polie à un remerciement.", "Merci ! - De rien.", "Misaotra ! - Tsy misy fisaorana."),
    ("Excusez-moi", "locution", "Azafady indrindra", "Formule pour capter l'attention ou s'excuser.", "Excusez-moi, où est la banque ?", "Azafady indrindra, aiza ny banky ?"),
    ("Bienvenue", "interj.", "Tonga soa", "Accueil chaleureux adressé à un visiteur.", "Soyez le bienvenu chez nous !", "Tonga soa eto aminay ianao !"),
    ("À bientôt", "locution", "Hita indray miaraka", "Formule d'adieu pour un revoir prochain.", "Bonne journée et à bientôt !", "Mirary andro finaritra ary hita indray !"),
    ("À demain", "locution", "Mandra-pampitso", "Salutation pour se revoir le lendemain.", "Au revoir, à demain !", "Veloma, mandra-pampitso !"),
    ("Félicitations", "n.f.pl.", "Arahaba / Arahabaina", "Compliments adressés pour un succès.", "Félicitations pour votre réussite !", "Arahabaina amin'ny fahombiazanao !"),
    ("Santé", "n.f.", "Fahasalamana", "État de bien-être physique et mental.", "Bonne santé à vous !", "Fahasalamana tsara ho anao !"),
    ("D'accord", "locution", "Eny ary / Mety izany", "Expression pour donner son consentement.", "D'accord, nous ferons comme ça.", "Eny ary, hanao toy izany isika."),
    ("Bien sûr", "locution", "Azo antoka / Mazava ho azy", "Expression marquant l'évidence.", "Bien sûr que je serai présent !", "Azo antoka fa ho avy aho !"),
    ("Pas de problème", "locution", "Tsy misy olana", "Expression assurant l'absence de difficulté.", "Pas de problème pour la livraison.", "Tsy misy olana amin'ny fampidirana."),
    ("Bon courage", "locution", "Mahazatà / Mahereza", "Souhait d'énergie pour une tâche.", "Bon courage pour votre travail !", "Mahereza amin'ny asanao !"),
    ("Bonne chance", "locution", "Tsara vintana", "Souhait de réussite.", "Bonne chance pour ton examen !", "Tsara vintana amin'ny fanadinanao !"),
    ("Bon appétit", "locution", "Mazotoa homana", "Souhait formulé avant de manger.", "Bon appétit à tous !", "Mazotoa homana ianareo rehetra !"),
    ("Enchanté", "adj.", "Faly mahafantatra anao", "Politesse lors d'une rencontre.", "Enchanté de faire votre connaissance.", "Faly mahafantatra anao aho."),
    ("Oui", "adv.", "Eny", "Affirmation.", "Oui, je suis d'accord.", "Eny, ekenko izany."),
    ("Non", "adv.", "Tsia", "Négation.", "Non, je ne peux pas venir.", "Tsia, tsy afaka avy aho."),
    ("Peut-être", "adv.", "Mety ho", "Expression de possibilité.", "Peut-être qu'il pleuvra demain.", "Mety ho avy ny rainay ampitso."),
    ("C'est vrai", "locution", "Marina izany", "Affirmation de vérité.", "C'est vrai, j'ai vu la scène.", "Marina izany, nahita ilay zavatra aho."),
    ("C'est faux", "locution", "Diso izany", "Déclaration d'inexactitude.", "C'est faux, ce n'est pas ce qui s'est passé.", "Diso izany, tsy izany no niseho."),
    ("Allô", "interj.", "Alô", "Salutation au téléphone.", "Allô, qui est à l'appareil ?", "Alô, iza izany miantso izany ?"),
    ("Bravo", "interj.", "Tsara be / Arahaba", "Applaudissement oral.", "Bravo pour cette performance !", "Tsara be izany fanaovana izany !"),
    ("Attention", "interj.", "Mitandrema", "Mise en garde.", "Attention au chien !", "Mitandrema amin'ny alika !"),
    ("Au secours", "interj.", "Vonjeo", "Appel de détresse.", "Au secours, aidez-moi !", "Vonjeo, ampion aho !"),
    ("Dommage", "n.m.", "Mampalahelo / Anina", "Regret pour un fait.", "C'est dommage qu'il ne soit pas venu.", "Mampalahelo fa tsy avy izy."),
    ("Bien", "adv.", "Tsara / Soa", "De manière satisfaisante.", "Tout va très bien.", "Mandeha tsara ny zavatra rehetra."),
    ("Mal", "adv.", "Ratsy", "De manière insatisfaisante.", "Je me sens mal ce soir.", "Ratsy fahasalamana aho izao hariva izao."),
    ("Aide", "n.f.", "Fanampiana", "Action de venir en secours à quelqu'un.", "J'ai besoin de votre aide.", "Mila ny fanampianao aho.")
]

for row in dataset_1:
    add(*row)

print("Batch 1 added. Total:", len(words))
