import os
import re

directory = "/Users/renga/Downloads/sri ganesh"
new_title = "Furura - Ganesh Printers"

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Regex to match the title tag and its content
            new_content = re.sub(r'<title>(.*?)</title>', f'<title>{new_title}</title>', content, flags=re.DOTALL)
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated title in: {filepath}")
            else:
                print(f"No title tag found or already updated in: {filepath}")
