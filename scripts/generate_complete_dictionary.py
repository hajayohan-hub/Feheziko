import json
import os

words = []
seen = set()

def add(w, t, tr, df, e_fr, e_mg):
    if not w or not tr:
        return
    key = w.lower().strip()
    if key in seen:
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

# Load initial 34 words
with open('src/languages/fr.json', 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

for item in fr_data.get('dictionary', []):
    add(item['word'], item['type'], item['translation'], item['definition'], item['example_fr'], item['example_mg'])

# CATEGORY 1: Expressions & Politesse
cat_expressions = [
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

for row in cat_expressions:
    add(*row)

# CATEGORY 2: Famille & Personnes
cat_family = [
    ("Père", "n.m.", "Ray", "Parent masculin.", "Mon père travaille à la banque.", "Miasa ao amin'ny banky ny raiko."),
    ("Mère", "n.f.", "Reny", "Parent féminin.", "Ma mère cuisine très bien.", "Mahay mahandro tena tsara ny reniko."),
    ("Frère", "n.m.", "Rahalahy / Anadahy", "Membre masculin de la fratrie.", "J'ai un frère plus âgé.", "Manana rahalahy zokiny kokoa aho."),
    ("Sœur", "n.f.", "Rahavavy / Anabavy", "Membre féminin de la fratrie.", "Ma sœur étudie à l'université.", "Mpianatra any amin'ny oniversite ny anabaviko."),
    ("Enfant", "n.", "Zaza", "Jeune être humain.", "L'enfant joue dans le jardin.", "Milalao ao an-jaridaina ny zaza."),
    ("Fils", "n.m.", "Zanakalahy", "Enfant de sexe masculin.", "Son fils a dix ans.", "Folo taona ny zanakalahiny."),
    ("Fille", "n.f.", "Zanakavavy", "Enfant de sexe féminin.", "Leur fille habite à Paris.", "Monina any Paris ny zanakavavin'izy ireo."),
    ("Grand-père", "n.m.", "Dadabe", "Père du père ou de la mère.", "Mon grand-père raconte des histoires.", "Mitantara tantara ny dadabeko."),
    ("Grand-mère", "n.f.", "Nenibe", "Mère du père ou de la mère.", "Ma grand-mère prépare du thé.", "Manao thé ny nenibeko."),
    ("Oncle", "n.m.", "Tonton / Zama", "Frère du père ou de la mère.", "Mon oncle nous rend visite.", "Mamangy anay ny tontonko."),
    ("Tante", "n.f.", "Neny kely / Tata", "Sœur du père ou de la mère.", "Ma tante habite à Tamatave.", "Monina any Toamasina ny tatako."),
    ("Cousin", "n.m.", "Cousin / Mpiray tampo", "Fils de l'oncle ou de la tante.", "Mon cousin joue au football.", "Milalao baolina kitra ny cousinko."),
    ("Cousine", "n.f.", "Cousine", "Fille de l'oncle ou de la tante.", "Ma cousine aime la musique.", "Tia mozika ny cousine-ko."),
    ("Mari", "n.m.", "Vady lahy", "Homme uni par le mariage.", "Son mari est professeur.", "Mpampianatra ny vadiny."),
    ("Femme", "n.f.", "Vady vavy / Vehivavy", "Adulte de sexe féminin ou épouse.", "Sa femme travaille à l'hôpital.", "Miasa ao amin'ny hopitaly ny vadiny."),
    ("Bébé", "n.m.", "Zazakely", "Très jeune enfant.", "Le bébé dort paisiblement.", "Matory am-pimonina ny zazakely."),
    ("Parents", "n.m.pl.", "Ray aman-dreny", "Le père et la mère.", "Mes parents habitent à la campagne.", "Monina any ambanivohitra ny ray aman-dreniko."),
    ("Voisin", "n.m.", "Mpifannoloka", "Personne qui habite à côté.", "Notre voisin est très aimable.", "Tena mahafinaritra ny mpifannoloka aminay."),
    ("Homme", "n.m.", "Lehilahy", "Être humain adulte de sexe masculin.", "Cet homme est très cultivé.", "Tena manam-pahaizana io lehilahy io."),
    ("Garçon", "n.m.", "Zazalahy", "Jeune homme ou enfant masculin.", "Le garçon court très vite.", "Mihazakazaka haingana be ilay zazalahy."),
    ("Neveu", "n.m.", "Zanaka lahy an-drahavavy", "Fils du frère ou de la sœur.", "Mon neveu apprend le français.", "Mianatra teny frantsay ny neveu-ko."),
    ("Nièce", "n.f.", "Zanaka vavy an-drahavavy", "Fille du frère ou de la sœur.", "Ma nièce aime dessiner.", "Tia manao saritany ny nièce-ko."),
    ("Beau-père", "n.m.", "Razana lahy", "Père du conjoint ou second mari.", "Mon beau-père est gentil.", "Tena tsara fanahy ny beau-père-ko."),
    ("Belle-mère", "n.f.", "Razana vavy", "Mère du conjoint ou seconde femme.", "Ma belle-mère habite ici.", "Monina eto ny belle-mère-ko."),
    ("Fiancé", "n.m.", "Olom-fianahana lahy", "Homme engagé en mariage.", "Son fiancé travaille en ville.", "Miasa ao an-tànana ny fiancé-ny."),
    ("Fiancée", "n.f.", "Olom-fianahana vavy", "Femme engagée en mariage.", "Sa fiancée habite tout près.", "Monina akaiky kely eo ny fiancée-ny."),
    ("Jumeaux", "n.m.pl.", "Kambana", "Deux enfants d'une même grossesse.", "Les jumeaux se ressemblent.", "Mifampitovy be ireo kambana ireo."),
    ("Adolescent", "n.m.", "Tanora", "Jeune entre l'enfance et l'âge adulte.", "Les adolescents aiment le sport.", "Tia spora ny tanora."),
    ("Ancêtre", "n.m.", "Razana", "Personne dont on descend.", "Le respect des ancêtres est sacré.", "Masina ny fanajàna ny razana."),
    ("Génération", "n.f.", "Taranaka", "Ensemble des personnes d'une même époque.", "Cette génération est moderne.", "Maoderina ity taranaka ity.")
]

for row in cat_family:
    add(*row)

print("Current total dict count:", len(words))
