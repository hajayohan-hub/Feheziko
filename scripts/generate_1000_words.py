import json
import os

print("Starting 1000 words generator script in Python...")

words = []
seen = set()

def add_word(word, word_type, translation, definition, example_fr, example_mg):
    key = word.lower().strip()
    if key in seen:
        return
    seen.add(key)
    words.append({
        "word": word.strip(),
        "type": word_type.strip(),
        "translation": translation.strip(),
        "definition": definition.strip(),
        "example_fr": example_fr.strip(),
        "example_mg": example_mg.strip()
    })

# Load base words from fr.json
with open('src/languages/fr.json', 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

base_dict = fr_data.get('dictionary', [])
for item in base_dict:
    add_word(item['word'], item['type'], item['translation'], item['definition'], item['example_fr'], item['example_mg'])

print(f"Base dictionary count: {len(words)}")
