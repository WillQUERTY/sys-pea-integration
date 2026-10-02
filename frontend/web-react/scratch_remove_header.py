import re
import os

files = [
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\groups\index.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\groups\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\products\index.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\products\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\researchers\index.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\researchers\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\projects\index.tsx",
]

# The regex should match:
# <Header>
#   <Search />
#   ...
# </Header>
# It could be multi-line.
header_pattern = re.compile(r"<Header>.*?</Header>", re.DOTALL)

for fpath in files:
    if not os.path.exists(fpath):
        print(f"File not found: {fpath}")
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove the Header component instantiation
    new_content = header_pattern.sub("", content)

    # Remove the imports that are typically only used in the Header
    # Since these are UI components they are usually one per line or destructured.
    # Usually: import { Header } from '@/components/layout/header'
    # Or import { ConfigDrawer } from '@/components/config-drawer'
    
    # We will just remove specific import lines completely.
    lines = new_content.split("\n")
    cleaned_lines = []
    for line in lines:
        if "import { Header }" in line or \
           "import { ConfigDrawer }" in line or \
           "import { ProfileDropdown }" in line or \
           "import { Search }" in line or \
           "import { ThemeSwitch }" in line:
            continue
        cleaned_lines.append(line)
        
    with open(fpath, "w", encoding="utf-8") as f:
        f.write("\n".join(cleaned_lines))
    print(f"Cleaned {fpath}")

