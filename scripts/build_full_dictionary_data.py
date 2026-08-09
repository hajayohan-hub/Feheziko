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

# 1. Load base words from fr.json
with open('src/languages/fr.json', 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

for item in fr_data.get('dictionary', []):
    add(item['word'], item['type'], item['translation'], item['definition'], item['example_fr'], item['example_mg'])

# 2. Import modules
from dict_data.expressions import items as expr_items
from dict_data.family import items as family_items
from dict_data.house import items as house_items
from dict_data.food import items as food_items
from dict_data.time_weather import items as time_items
from dict_data.city import items as city_items
from dict_data.health import items as health_items
from dict_data.work import items as work_items
from dict_data.education_tech import items as edu_items
from dict_data.nature_animals import items as nature_items
from dict_data.clothes_colors import items as clothes_items
from dict_data.verbs import items as verb_items
from dict_data.adjectives import items as adj_items
from dict_data.grammar import items as gram_items
from dict_data.expansion import items as exp1_items
from dict_data.expansion_2 import items as exp2_items
from dict_data.expansion_3 import items as exp3_items
from dict_data.expansion_4 import items as exp4_items
from dict_data.expansion_5 import items as exp5_items
from dict_data.expansion_6 import items as exp6_items
from dict_data.expansion_7 import items as exp7_items
from dict_data.expansion_8 import items as exp8_items

all_modules = [
    expr_items, family_items, house_items, food_items, time_items,
    city_items, health_items, work_items, edu_items, nature_items,
    clothes_items, verb_items, adj_items, gram_items,
    exp1_items, exp2_items, exp3_items, exp4_items, exp5_items, exp6_items, exp7_items, exp8_items
]

for mod in all_modules:
    for row in mod:
        add(*row)

print(f"Total unique words compiled: {len(words)}")

# 3. Update fr.json
fr_data['dictionary'] = words
with open('src/languages/fr.json', 'w', encoding='utf-8') as f:
    json.dump(fr_data, f, ensure_ascii=False, indent=2)

print("Successfully updated src/languages/fr.json with new dictionary dataset.")

# 4. Generate src/data/dictionaryData.ts
ts_content = f"// Auto-generated dictionary dataset containing {len(words)} entries\n"
ts_content += "export interface DictionaryWord {\n"
ts_content += "  word: string;\n"
ts_content += "  type: string;\n"
ts_content += "  translation: string;\n"
ts_content += "  definition: string;\n"
ts_content += "  example_fr: string;\n"
ts_content += "  example_mg: string;\n"
ts_content += "}\n\n"
ts_content += "export const dictionaryData: DictionaryWord[] = " + json.dumps(words, ensure_ascii=False, indent=2) + ";\n"

os.makedirs('src/data', exist_ok=True)
with open('src/data/dictionaryData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print("Successfully created src/data/dictionaryData.ts.")
