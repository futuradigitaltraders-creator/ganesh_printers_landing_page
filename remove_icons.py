import os
import re

directory = "/Users/renga/Downloads/sri ganesh"

# List of targets: (regex_start_pattern, tag_name)
targets = [
    (r'<a\s+[^>]*class="[^"]*search-trigger[^"]*"[^>]*>', 'a'),
    (r'<a\s+[^>]*class="[^"]*user-icon[^"]*"[^>]*>', 'a'),
    (r'<div\s+[^>]*class="[^"]*menu-cart[^"]*"[^>]*>', 'div'),
    (r'<div\s+[^>]*id="targetElement"[^>]*>', 'div'),
    (r'<div\s+[^>]*class="[^"]*search-wrap[^"]*"[^>]*>', 'div'),
]

def find_closing_index(text, start_index, tag_name):
    # Simple parser to find matching closing tag
    # This assumes the start_index is right after the opening match
    # We need to consider the initial opening tag as already matched (balance=1) if we start AFTER it
    # BUT my logic below invokes this from the START of the opening tag??
    # No, let's parse from the end of the opening tag match.
    
    balance = 1
    # We need to find <tag and </tag in the rest of the string
    # We'll use a regex to iterate over tags
    
    # Regex to match <tag... or </tag...
    # Case insensitive for tag name validity? HTML is flexible but mainly lowercase here.
    tag_pattern = re.compile(r'</?' + tag_name + r'(?:\s+[^>]*)?>', re.IGNORECASE)
    
    current_pos = start_index 
    
    while balance > 0:
        match = tag_pattern.search(text, current_pos)
        if not match:
            return None # Unbalanced or not found
        
        if match.group(0).lower().startswith(f'</{tag_name}'):
            balance -= 1
        else:
            # Self-closing tags? <div /> is rare in valid HTML5 (void elements are different)
            # but standard div/a are not void.
            # Only void elements (img, br, etc) don't need closing. 
            # If tag_name is 'a' or 'div', they need explicit closing.
            balance += 1
            
        current_pos = match.end()
        
    return current_pos

def remove_balanced_block(content, start_regex, tag_name):
    pattern = re.compile(start_regex, re.IGNORECASE | re.DOTALL)
    
    while True:
        match = pattern.search(content)
        if not match:
            break
            
        start_idx = match.start()
        # Find the end of this matched opening tag to ensure we don't double count it
        # Actually, find_closing_index needs to start searching AFTER this opening tag.
        # But wait, find_closing_index logic counts the nesting. 
        # If I start searching for tags AFTER the opening tag, then balance starts at 1.
        
        end_idx = find_closing_index(content, match.end(), tag_name)
        
        if end_idx:
            # Remove content from start_idx to end_idx
            # Also remove a preceding newline if it exists to clean up
            # Check backwards from start_idx for whitespace + newline
            # This is optional polish.
            
            # Actual removal
            content = content[:start_idx] + content[end_idx:]
            print(f"Removed block: {tag_name} at index {start_idx}")
        else:
            print(f"Could not find closing tag for {tag_name} starting at {start_idx}")
            # Break to avoid infinite loop on same match
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
