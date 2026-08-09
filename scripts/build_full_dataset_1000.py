import json
import os

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

# Read initial fr.json
with open('src/languages/fr.json', 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

for item in fr_data.get('dictionary', []):
    add(item['word'], item['type'], item['translation'], item['definition'], item['example_fr'], item['example_mg'])

# CATEGORY 1: Famille & Relations (Family & Relationships)
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
    ["Voisin", "n.m.", "Mpifannoloka", "Personne qui habite à côté.", "Notre voisin est très aimable.", "Tena mahafinaritra ny mpifannoloka aminay."],
    ["Homme", "n.m.", "Lehilahy", "Être humain adulte de sexe masculin.", "Cet homme est très cultivé.", "Tena manam-pahaizana io lehilahy io."],
    ["Garçon", "n.m.", "Zazalahy", "Jeune homme ou enfant masculin.", "Le garçon court très vite.", "Mihazakazaka haingana be ilay zazalahy."],
    ["Neveu", "n.m.", "Zanaka lahy an-drahavavy", "Fils du frère ou de la sœur.", "Mon neveu apprend le français.", "Mianatra teny frantsay ny neveu-ko."],
    ["Nièce", "n.f.", "Zanaka vavy an-drahavavy", "Fille du frère ou de la sœur.", "Ma nièce aime dessiner.", "Tia manao saritany ny nièce-ko."],
    ["Beau-père", "n.m.", "Razana lahy", "Père du conjoint ou second mari.", "Mon beau-père est gentil.", "Tena tsara fanahy ny beau-père-ko."],
    ["Belle-mère", "n.f.", "Razana vavy", "Mère du conjoint ou seconde femme.", "Ma belle-mère habite ici.", "Monina eto ny belle-mère-ko."],
    ["Fiancé", "n.m.", "Olom-fianahana lahy", "Homme engagé en mariage.", "Son fiancé travaille en ville.", "Miasa ao an-tànana ny fiancé-ny."],
    ["Fiancée", "n.f.", "Olom-fianahana vavy", "Femme engagée en mariage.", "Sa fiancée habite tout près.", "Monina akaiky kely eo ny fiancée-ny."],
    ["Jumeaux", "n.m.pl.", "Kambana", "Deux enfants d'une même grossesse.", "Les jumeaux se ressemblent.", "Mifampitovy be ireo kambana ireo."],
    ["Adolescent", "n.m.", "Tanora", "Jeune entre l'enfance et l'âge adulte.", "Les adolescents aiment le sport.", "Tia spora ny tanora."],
    ["Ancêtre", "n.m.", "Razana", "Personne dont on descend.", "Le respect des ancêtres est sacré.", "Masina ny fanajàna ny razana."],
    ["Génération", "n.f.", "Taranaka", "Ensemble des personnes d'une même époque.", "Cette génération est moderne.", "Maoderina ity taranaka ity."]
]

for row in cat_family:
    add(*row)

print("Loaded family. Total words:", len(words))
