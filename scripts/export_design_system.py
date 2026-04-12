import json
import os
import re

def export_design_system():
    web_dir = 'apps/web'
    output_file = 'output/reports/DESIGN_SYSTEM_EXPORT.md'
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    css_content = ""
    with open(f"{web_dir}/app/globals.css", "r", encoding="utf-8") as f:
        css_content = f.read()
        
    components_json = {}
    try:
        with open(f"{web_dir}/components.json", "r", encoding="utf-8") as f:
            components_json = json.load(f)
    except:
        pass
        
    ui_components = []
    ui_dir = f"{web_dir}/components/ui"
    if os.path.exists(ui_dir):
        ui_components = [f.replace('.tsx', '') for f in os.listdir(ui_dir) if f.endswith('.tsx')]
        
    package_json = {}
    try:
        with open(f"{web_dir}/package.json", "r", encoding="utf-8") as f:
            package_json = json.load(f)
    except:
        pass

    with open(output_file, 'w', encoding="utf-8") as out:
        out.write("# 🎨 Design System Export (AI-Readable Format)\n\n")
        out.write("> Este documento contém a extração do Design System do projeto para que outra IA possa replicá-lo em outro UI.\n\n")
        
        out.write("## 1. Stack & Configuração Base\n")
        out.write("- **Framework**: Next.js (App Router)\n")
        out.write("- **Styling**: Tailwind CSS v4\n")
        out.write("- **Color Space**: OkLch (Suporte a temas nativos)\n")
        out.write("- **Components Library**: shadcn/ui + 21st.dev primitives\n")
        out.write("- **Icons**: Material Symbols Outlined (Weight 200) ou Lucide\n\n")
        
        out.write("## 2. Design Tokens (CSS Variables em OkLch)\n")
        out.write("Abaixo estão os tokens extraídos diretamente do `globals.css` (Tailwind v4).\n\n")
        out.write("```css\n")
        
        theme_match = re.search(r'(@theme inline \{.*?\})', css_content, re.DOTALL)
        if theme_match:
            out.write(theme_match.group(1) + "\n\n")
            
        root_match = re.search(r'(:root \{.*?\})', css_content, re.DOTALL)
        if root_match:
            out.write(root_match.group(1) + "\n\n")
            
        dark_match = re.search(r'(\.dark \{.*?\})', css_content, re.DOTALL)
        if dark_match:
            out.write(dark_match.group(1) + "\n")
            
        out.write("```\n\n")
        
        out.write("## 3. Primitives e Dependências Ui\n")
        out.write("### Componentes Instalados (`components/ui`)\n")
        for comp in sorted(ui_components):
            out.write(f"- `{comp}`\n")
        out.write("\n")
            
        out.write("### Packages e Core (via `package.json`)\n")
        deps = {**package_json.get('dependencies', {}), **package_json.get('devDependencies', {})}
        out.write("```json\n")
        out.write(json.dumps({k: v for k, v in deps.items() if any(sub in k for sub in ['radix', 'tailwind', 'lucide', 'motion', 'base-ui', 'shadcn'])}, indent=2))
        out.write("\n```\n\n")
        
        out.write("## 4. Diretrizes para Replicação (System Prompt)\n")
        out.write(
            "Se você (uma IA) estiver gerando novos compenentes isolados para este Design System, obedeça às seguintes regras:\n"
            "1. **Use Tailwind v4**: A estilização depende puramente de utilitários como `bg-background`, `text-foreground`, `border-border`, etc.\n"
            "2. **Theming**: As cores (ex: primary, secondary, destructive) estão em **OkLch** e reagem dinamicamente à classe `.dark` no root. Nunca fixe cores em HEX ou RGB.\n"
            "3. **Bordas Dinâmicas**: Aplique arredondamento semântico (`rounded-md`, `rounded-lg`).\n"
            "4. **Componentes sem Headless UI pesadas**: Prefira Radix UI primitives ou tags HTML nativas (`<dialog>`, `<button>`) estilizadas de acordo.\n"
        )
        
    print(f"Exported AI-readable Design System to {output_file}")

if __name__ == '__main__':
    export_design_system()
