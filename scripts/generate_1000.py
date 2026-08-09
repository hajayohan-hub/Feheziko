import json
import os

# Create scripts/dict_data/__init__.py
os.makedirs('scripts/dict_data', exist_ok=True)
with open('scripts/dict_data/__init__.py', 'w') as f:
    f.write('')

print("Init package ready.")
