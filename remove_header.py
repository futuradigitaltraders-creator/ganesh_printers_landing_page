
import os
import re

directory = "/Users/renga/Downloads/sri ganesh/modinatheme.com/html/printnow-html"

def remove_header_top_section(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    in_section = False
    div_count = 0
    removed = False

    for line in lines:
        if '<div class="header-top-section">' in line:
            in_section = True
            div_count = 0
            # Count divs in this line (start of section)
            div_count += line.count('<div')
            div_count -= line.count('</div')
            removed = True
            continue

        if in_section:
            div_count += line.count('<div')
            div_count -= line.count('</div')
            
            if div_count <= 0:
                in_section = False
            continue
        
        new_lines.append(line)

    if removed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Updated {os.path.basename(filepath)}")
    else:
        print(f"Skipped {os.path.basename(filepath)} (section not found)")

for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        remove_header_top_section(filepath)
