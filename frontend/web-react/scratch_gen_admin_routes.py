import os
import shutil
import re

public_base = r"C:\repos\sys_pea_integration\frontend\web-react\src\routes\_public"
admin_base = r"C:\repos\sys_pea_integration\frontend\web-react\src\routes\admin"

for feature in ["groups", "products", "researchers", "projects"]:
    pub_dir = os.path.join(public_base, feature)
    adm_dir = os.path.join(admin_base, feature)
    os.makedirs(adm_dir, exist_ok=True)
    
    for filename in os.listdir(pub_dir):
        if not filename.endswith(".tsx"):
            continue
            
        pub_file = os.path.join(pub_dir, filename)
        adm_file = os.path.join(adm_dir, filename)
        
        with open(pub_file, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Change route path
        content = content.replace(f'/_public/{feature}', f'/admin/{feature}')
        
        # We need to wrap the component in an arrow function to pass isAdmin={true}
        # Example: component: Groups, -> component: () => <Groups isAdmin={true} />,
        if "index" in filename:
            comp_name = feature.capitalize()
            content = re.sub(r"component:\s*" + comp_name + r",", f"component: () => <{comp_name} isAdmin={{true}} />,", content)
        elif "$id" in filename:
            comp_name = feature.capitalize()[:-1] + "Detail"
            content = re.sub(r"component:\s*" + comp_name + r",", f"component: () => <{comp_name} isAdmin={{true}} />,", content)
            
        with open(adm_file, "w", encoding="utf-8") as f:
            f.write(content)
            
print("Admin routes generated successfully.")
