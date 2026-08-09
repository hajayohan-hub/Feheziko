import json
import sys

# Script that builds exactly 1000 high-quality French-Malagasy dictionary items
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

# Load base fr.json
with open('src/languages/fr.json', 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

for item in fr_data.get('dictionary', []):
    add(item['word'], item['type'], item['translation'], item['definition'], item['example_fr'], item['example_mg'])

print(f"Loaded initial {len(words)} base words from fr.json")
