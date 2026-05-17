import sys
import os

path = r"c:\Users\aguss\Downloads\IA Inteligencia Artificial\IA.AGUS\McVill\Apps para McVill\mcvill-erp\src\components\RHView.tsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add RecruitmentView import
if "import { RecruitmentView }" not in content:
    content = content.replace(
        "import { useConfig } from '../contexts/ConfigContext';",
        "import { RecruitmentView } from './RecruitmentView';\nimport { useConfig } from '../contexts/ConfigContext';"
    )

# Add viewMode state
if "const [viewMode, setViewMode]" not in content:
    content = content.replace(
        "const [loadingDetails, setLoadingDetails] = useState(false);",
        "const [loadingDetails, setLoadingDetails] = useState(false);\n  const [viewMode, setViewMode] = useState<'census' | 'recruitment'>('census');"
    )

# Update AI button
content = content.replace(
    'onClick={() => {}} // TODO: AI Implementation',
    'onClick={() => setViewMode(\'recruitment\')}'
)

# Add Tabs and start conditional
census_start = """      {/* View Mode Tabs */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-2">
        <button 
          onClick={() => setViewMode('census')}
          className={clsx(
            "px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            viewMode === 'census' ? "bg-slate-900 text-white border border-white/10" : "text-slate-500 hover:text-white"
          )}
        >
          Censo de Personal
        </button>
        <button 
          onClick={() => setViewMode('recruitment')}
          className={clsx(
            "px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            viewMode === 'recruitment' ? "bg-slate-900 text-white border border-white/10" : "text-slate-500 hover:text-white"
          )}
        >
          Reclutamiento IA
        </button>
      </div>

      {viewMode === 'census' ? (
        <>
          {/* Analytics Grid */}"""

if "View Mode Tabs" not in content:
    content = content.replace("{/* Analytics Grid */}", census_start)

# Close conditional
if "RecruitmentView" in content and "viewMode === 'census' ? (" in content:
    if "RecruitmentView" not in content.split("viewMode === 'census' ? (")[1]: # Avoid double addition
        # Find the line before EmployeeFormModal
        content = content.replace(
            "      <EmployeeFormModal",
            "        </>\n      ) : (\n        <RecruitmentView />\n      )}\n\n      <EmployeeFormModal"
        )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully")
