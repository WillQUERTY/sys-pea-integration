import os

base_path = r"C:\repos\sys_pea_integration\frontend\web-react\src\routes\admin"
features = ["groups", "products", "researchers", "projects"]

for feature in features:
    feature_dir = os.path.join(base_path, feature)
    os.makedirs(feature_dir, exist_ok=True)
    
    # index.tsx
    index_content = f"""import {{ createFileRoute }} from '@tanstack/react-router'
import {{ {feature.capitalize()} }} from '@/features/{feature}'

export const Route = createFileRoute('/admin/{feature}/')({{
  validateSearch: (search: Record<string, unknown>): {{ search?: string }} => ({{
    search: typeof search.search === 'string' ? search.search : undefined,
  }}),
  component: () => <{feature.capitalize()} isAdmin={{true}} />,
}})
"""
    with open(os.path.join(feature_dir, "index.tsx"), "w", encoding="utf-8") as f:
        f.write(index_content)

    # $id.tsx (Notice for researchers and groups it's different. Wait, for detail pages, we don't have an isAdmin prop yet! 
    # But wait, we DO need to pass it, or we can just leave it for now. Let's pass isAdmin to the feature detail component.)
    
    # Let's check what the component name is for the detail pages. It's usually `GroupDetail`, `ProductDetail`, etc.
    # Actually, in the public route, it's just imported directly from the feature's detail.tsx.
    
    id_content = f"""import {{ createFileRoute }} from '@tanstack/react-router'
import {{ {feature.capitalize()[:-1]}Detail }} from '@/features/{feature}/detail'

export const Route = createFileRoute('/admin/{feature}/$id')({{
  component: () => <{feature.capitalize()[:-1]}Detail isAdmin={{true}} />,
}})
"""
    if feature == "researchers":
         id_content = id_content.replace("ResearcherDetail", "ResearcherProfile")
    elif feature == "groups":
         id_content = id_content.replace("GroupDetail", "GroupProfile")
    elif feature == "projects":
         id_content = id_content.replace("ProjectDetail", "ProjectProfile") # Wait, I don't know the exact export name! Let me just use standard lazy loading or check it.
         
    # Actually it's easier to just copy the _public files and add isAdmin={true}
