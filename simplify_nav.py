import os
import re

directory = "/Users/renga/Downloads/sri ganesh"

# Updated nav content with specific services list
new_nav_content = """<nav id="mobile-menu">
                                    <ul>
                                        <li>
                                            <a href="index04b9.html">Home</a>
                                        </li>
                                        <li>
                                            <a href="about.html">About Us</a>
                                        </li>
                                        <li class="has-dropdown">
                                            <a href="service.html">Services</a>
                                            <ul class="submenu">
                                                <li><a href="service-details.html">Digital Marketing</a></li>
                                                <li><a href="service-details.html">Flex Printing</a></li>
                                                <li><a href="service-details.html">L.E.D. Sign Board</a></li>
                                                <li><a href="service-details.html">LED NEON Boards</a></li>
                                                <li><a href="service-details.html">Multi Colour Printing</a></li>
                                                <li><a href="service-details.html">Calendar & Dairy</a></li>
                                                <li><a href="service-details.html">Photo Frames</a></li>
                                                <li><a href="service-details.html">T-Shirt Printing</a></li>
                                                <li><a href="service-details.html">Corporate Gifts</a></li>
                                                <li><a href="service-details.html">Digital Printing</a></li>
                                            </ul>
                                        </li>
                                        <li>
                                            <a href="contact.html">Contact</a>
                                        </li>
                                    </ul>
                                </nav>"""

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Regex to find the nav block
            # Matches <nav id="mobile-menu"> ... </nav>
            # We use DOTALL to match newlines
            pattern = re.compile(r'<nav id="mobile-menu">.*?</nav>', re.DOTALL)
            
            if pattern.search(content):
                new_content = pattern.sub(new_nav_content, content)
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated nav in: {filepath}")
            else:
                print(f"Nav not found in: {filepath}")
