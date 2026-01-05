import os
import re

directory = "/Users/renga/Downloads/sri ganesh"

# Target regex to match the logo div and its content loosely
# We'll match <div class="logo"> ... </div>
# Inside it usually has two links with images

# We will construct a generic regex to capture the whole div content if it contains logo.svg
# But since the HTML might vary slightly in spacing, we use a slightly more robust approach:
# Find <div class="logo">, then look for closing div, and replace content.

pattern = re.compile(r'(<div class="logo">)(.*?)(</div>)', re.DOTALL | re.IGNORECASE)

replacement_content = """
                            <a href="index04b9.html" class="header-logo">
                                <h2 style="margin:0; font-size: 24px; color: #09052F; font-weight: 700;">Ganesh Printers</h2>
                            </a>
                            <a href="index04b9.html" class="header-logo-2">
                                <h2 style="margin:0; font-size: 24px; color: #ffffff; font-weight: 700;">Ganesh Printers</h2>
                            </a>
"""

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Helper to check if we are replacing the right thing:
            # Check if content has assets/img/logo/logo.svg to be sure we aren't replacing something else
            if "assets/img/logo/logo.svg" in content:
                # We want to replace the INNER content of <div class="logo">
                # But our regex groups are: 1=start, 2=inner, 3=end
                # So we substitute with group 1 + new_inner + group 3
                
                new_content = pattern.sub(r'\1' + replacement_content + r'\3', content)
                
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated logo in: {filepath}")
            else:
                 print(f"Logo pattern not found or already updated in: {filepath}")
