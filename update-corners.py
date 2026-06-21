import os
import re

# Files to update
TARGET_FILES = [
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\pricing\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\login\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\signup\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\dashboard\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\dashboard\charity\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\dashboard\draws\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\dashboard\scores\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\dashboard\subscription\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\app\dashboard\settings\page.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\components\navbar.js",
    r"c:\Users\himan\OneDrive\Desktop\Fundora\components\footer.js",
]

def update_file_corners(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping: {file_path} (does not exist)")
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    
    # 1. Large Hero Cards (rounded-lg/sm/xl bg-gradient-to-br) -> rounded-3xl
    content = re.sub(
        r'rounded-(sm|md|lg|xl)\s+([^"]*bg-gradient-to-br[^"]*)',
        r'rounded-3xl \2',
        content
    )
    
    # 2. Specific dashboard welcome hero card
    content = content.replace('rounded-lg p-6 md:p-8', 'rounded-3xl p-6 md:p-8')
    content = content.replace('rounded-lg shadow-sm hover:border-accent/40', 'rounded-2xl shadow-sm hover:border-accent/40')
    content = content.replace('rounded-lg mb-6', 'rounded-2xl mb-6')
    content = content.replace('rounded-lg shadow-xl', 'rounded-2xl shadow-xl')
    content = content.replace('rounded-lg text-center', 'rounded-2xl text-center')
    
    # 3. Inputs & forms rounding
    content = content.replace('rounded-sm border border-border focus:outline-none', 'rounded-xl border border-border focus:outline-none')
    content = content.replace('rounded-sm border border-border/40 text-xs', 'rounded-xl border border-border/40 text-xs')
    content = content.replace('rounded-sm text-xs text-foreground focus:outline-none', 'rounded-xl text-xs text-foreground focus:outline-none')
    
    # 4. Timer digits (rounded-sm border border-border/30) -> rounded-xl
    content = content.replace('rounded-sm border border-border/30', 'rounded-xl border border-border/30')
    content = content.replace('rounded-sm border border-accent/40 text-accent', 'rounded-xl border border-accent/40 text-accent')
    
    # 5. List items and rows (rounded-sm border border-border/40) -> rounded-xl
    content = content.replace('rounded-sm border border-border/40 bg-secondary/15', 'rounded-xl border border-border/40 bg-secondary/15')
    content = content.replace('rounded-sm border border-border/30', 'rounded-xl border border-border/30')
    content = content.replace('rounded-sm border border-border/40', 'rounded-xl border border-border/40')
    content = content.replace('rounded-sm bg-secondary/15', 'rounded-xl bg-secondary/15')
    content = content.replace('rounded-sm bg-secondary/20', 'rounded-xl bg-secondary/20')
    content = content.replace('rounded-sm bg-secondary/10', 'rounded-xl bg-secondary/10')
    content = content.replace('rounded-sm bg-secondary/5', 'rounded-xl bg-secondary/5')
    
    # 6. Tab switcher items (rounded-sm text-xs font-semibold) -> rounded-xl
    content = content.replace('rounded-sm text-xs font-semibold', 'rounded-xl text-xs font-semibold')
    content = content.replace('rounded-sm text-xs font-bold', 'rounded-xl text-xs font-bold')
    content = content.replace('rounded-sm bg-secondary hover:bg-secondary/80', 'rounded-xl hover:bg-secondary/80')
    
    # 7. Miscellaneous blocky elements
    content = content.replace('rounded-sm bg-accent', 'rounded-xl bg-accent')
    content = content.replace('rounded-sm bg-card/60', 'rounded-2xl bg-card/60')
    content = content.replace('rounded-sm border-accent/20 bg-accent/5', 'rounded-2xl border-accent/20 bg-accent/5')
    content = content.replace('rounded-sm border border-dashed border-border/60 bg-secondary/5', 'rounded-2xl border border-dashed border-border/60 bg-secondary/5')
    content = content.replace('rounded-sm border border-border bg-card/45', 'rounded-2xl border border-border bg-card/45')
    content = content.replace('rounded-sm border border-dashed border-border/50', 'rounded-2xl border border-dashed border-border/50')
    content = content.replace('rounded-sm bg-secondary/20 p-3', 'rounded-xl bg-secondary/20 p-3')
    
    # 8. Logo rounded corner
    content = content.replace('rounded-sm bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A]', 'rounded-xl bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A]')
    content = content.replace('rounded-sm bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-lg select-none', 'rounded-xl bg-accent flex items-center justify-center font-heading font-extrabold text-[#060C0A] text-lg select-none')
    
    # 9. Clean up any remaining simple blocky button corners
    content = re.sub(
        r'rounded-sm(\s+border\s+border-border)?\s+cursor-pointer',
        r'rounded-xl\1 cursor-pointer',
        content
    )

    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {file_path}")
    else:
        print(f"No changes: {file_path}")

if __name__ == "__main__":
    print("Running border radius standardization script...")
    for file_path in TARGET_FILES:
        update_file_corners(file_path)
    print("Standardization complete.")
