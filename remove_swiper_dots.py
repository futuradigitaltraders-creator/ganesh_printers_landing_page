import os
import re

directory = "/Users/renga/Downloads/sri ganesh"

# Target: (regex_start_pattern, tag_name)
targets = [
    (r'<div\s+[^>]*class="[^"]*swiper-dot-2[^"]*"[^>]*>', 'div'),
]

def find_closing_index(text, start_index, tag_name):
    balance = 1
    tag_pattern = re.compile(r'</?' + tag_name + r'(?:\s+[^>]*)?>', re.IGNORECASE)
    current_pos = start_index 
    while balance > 0:
        match = tag_pattern.search(text, current_pos)
        if not match: return None
        if match.group(0).lower().startswith(f'</{tag_name}'): balance -= 1
        else: balance += 1
        current_pos = match.end()
    return current_pos

def remove_balanced_block(content, start_regex, tag_name):
    pattern = re.compile(start_regex, re.IGNORECASE | re.DOTALL)
    while True:
        match = pattern.search(content)
        if not match: break
        start_idx = match.start()
        end_idx = find_closing_index(content, match.end(), tag_name)
        if end_idx:
            content = content[:start_idx] + content[end_idx:]
            print(f"Removed block: {tag_name} at index {start_idx}")
        else:
            print(f"Could not find closing tag for {tag_name} starting at {start_idx}")
            break
    return content

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            original_content = content
            for start_regex, tag_name in targets:
                content = remove_balanced_block(content, start_regex, tag_name)
            if content != original_content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated: {filepath}")
