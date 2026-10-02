import os
import re

files = [
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\groups\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\products\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\researchers\detail.tsx",
]
# Wait, projects doesn't have a detail.tsx! Let's check.
projects_detail = r"C:\repos\sys_pea_integration\frontend\web-react\src\features\projects\detail.tsx"
if os.path.exists(projects_detail):
    files.append(projects_detail)

for fpath in files:
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Change export function XXXDetail() to export function XXXDetail({ isAdmin = false }: { isAdmin?: boolean })
    content = re.sub(r'export function (\w+Detail)\(\)\s*\{', r'export function \1({ isAdmin = false }: { isAdmin?: boolean }) {', content)
    # ResearcherProfile? GroupProfile?
    content = re.sub(r'export function (\w+Profile)\(\)\s*\{', r'export function \1({ isAdmin = false }: { isAdmin?: boolean }) {', content)
    
    # We must be careful to just replace `<Header> ... </Header>` with `{isAdmin && <Header>...</Header>}`
    # Some files have multiple Headers (e.g. inside `if (isLoading)`)
    
    def replacer(match):
        return "{isAdmin && (\n" + match.group(0) + "\n)}"
        
    content = re.sub(r'<Header>.*?</Header>', replacer, content, flags=re.DOTALL)
    
    # Note: ArrowLeft might be unused if we wrapped it, but it's still inside JSX so it won't be a TS error!
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Detail files patched.")
