import os
import re

directory = "/Users/renga/Downloads/sri ganesh"
target_term = "printnow"
replacement_term = "Ganesh Printers"

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Case-insensitive replacement
            # re.sub with ignorecase
            new_content = re.sub(re.escape(target_term), replacement_term, content, flags=re.IGNORECASE)
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Rebranded: {filepath}")
