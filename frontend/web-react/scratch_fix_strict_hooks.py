import os
import re

files = [
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\groups\index.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\groups\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\products\index.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\products\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\researchers\index.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\researchers\detail.tsx",
    r"C:\repos\sys_pea_integration\frontend\web-react\src\features\projects\index.tsx",
]
projects_detail = r"C:\repos\sys_pea_integration\frontend\web-react\src\features\projects\detail.tsx"
if os.path.exists(projects_detail):
    files.append(projects_detail)

for fpath in files:
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Replace useSearch
    content = re.sub(
        r'const urlSearch = useSearch\(\{ from: \'.*?\' \}\)', 
        r'const urlSearch = (useSearch({ strict: false }) as { search?: string }) ?? {}', 
        content
    )
    
    # Replace useParams
    content = re.sub(
        r'const \{ (.*?) \} = useParams\(\{ from: \'.*?\' \}\)', 
        r'const { \1 } = useParams({ strict: false }) as { \1: string }', 
        content
    )
    
    # Actually wait, useParams might extract multiple things, or just id.
    # Usually it's `const { id } = useParams({ from: '/_authenticated/groups/$id' })`
    
    # In groups/index.tsx, `search: typeof search.search === 'string' ? search.search : undefined`
    # Let's see if this fixes the TS errors.
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Fixed strict routing hooks.")
