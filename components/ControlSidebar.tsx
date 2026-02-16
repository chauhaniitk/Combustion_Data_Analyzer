import React, { useRef } from 'react';
import { 
  Upload, Settings, RotateCcw, FileSpreadsheet, Download, Plus, Phone, Mail, Globe,
  X, Eye, EyeOff
} from 'lucide-react';
import { EngineParams, SimulationCase } from '../types';

// --- INTERNAL COMPONENT: SimulationCard ---
interface SimulationCardProps extends SimulationCase {
  isVisible: boolean;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

const SimulationCard: React.FC<SimulationCardProps> = ({
  id,
  shift,
  color,
  isVisible,
  onDelete,
  onToggleVisibility,
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-2">
      <div className="flex items-center gap-3">
        <div 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: color }}
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">Shift: {shift > 0 ? '+' : ''}{shift}°</span>
          <span className="text-xs text-gray-500">Case ID: {id.slice(0, 4)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleVisibility(id)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title={isVisible ? "Hide Curve" : "Show Curve"}
        >
          {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          onClick={() => onDelete(id)}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Remove Case"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// --- MAIN SIDEBAR COMPONENT ---
interface ControlSidebarProps {
  engineParams: EngineParams;
  onParamChange: (field: keyof EngineParams, value: string) => void;
  gamma: number;
  setGamma: (val: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string;
  shiftInput: string;
  setShiftInput: (val: string) => void;
  onAddSimulation: () => void;
  hasRawData: boolean;
  simulations: SimulationCase[];
  onRemoveSimulation: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onExportExcel: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  engineParams, onParamChange, gamma, setGamma, onFileUpload, fileName,
  shiftInput, setShiftInput, onAddSimulation, hasRawData, simulations,
  onRemoveSimulation, onToggleVisibility, onExportExcel
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="w-96 bg-white border-r border-gray-200 flex flex-col shadow-xl z-20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-center">
           <div className="flex-1 text-center">
              <h1 className="text-xl font-serif font-bold text-[#800000] leading-none mb-1">Engine Research Laboratory</h1>
              <p className="text-sm font-serif font-semibold text-[#800000] leading-tight">Indian Institute of Technology Kanpur</p>
              <p className="text-sm font-serif font-bold text-[#800000] leading-tight">Kanpur, India (208016)</p>
           </div>
        </div>
        <div className="mt-3 text-center border-t border-dashed border-gray-200 pt-2">
           <a href="https://www.iitk.ac.in/erl/" target="_blank" rel="noopener noreferrer" className="text-xs text-[#800000] hover:underline flex items-center justify-center gap-1 transition-colors font-medium">
             <Globe size={12} /> www.iitk.ac.in/erl
           </a>
        </div>
      </div>

      <div className="p-6 space-y-8 flex-1">
        {/* Engine Params */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-[#800000]">
            <Settings size={18} />
            <h2 className="font-semibold">Engine Parameters</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Swept Vol (cc)</label>
              <input type="number" value={engineParams.sweptVolume} onChange={(e) => onParamChange('sweptVolume', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#800000] outline-none text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Comp. Ratio</label>
              <input type="number" value={engineParams.rc} onChange={(e) => onParamChange('rc', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#800000] outline-none text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Rod Length (mm)</label>
              <input type="number" value={engineParams.conRodLength} onChange={(e) => onParamChange('conRodLength', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#800000] outline-none text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Stroke (mm)</label>
              <input type="number" value={engineParams.stroke} onChange={(e) => onParamChange('stroke', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#800000] outline-none text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Gamma (γ)</label>
              <input type="number" step="0.01" value={gamma} onChange={(e) => setGamma(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#800000] outline-none text-sm" />
            </div>
          </div>
        </section>

        {/* Data Import */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-[#800000]">
            <FileSpreadsheet size={18} />
            <h2 className="font-semibold">Data Import</h2>
          </div>
          <div className="bg-[#fef2f2] border-2 border-dashed border-red-200 rounded-lg p-6 text-center hover:border-[#800000] transition-colors group">
            <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" onChange={onFileUpload} className="hidden" />
            <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="text-red-300 group-hover:text-[#800000] mb-2 transition-colors" size={24} />
              <span className="text-sm font-medium text-[#800000]">{fileName ? fileName : "Select Data File"}</span>
              <span className="text-[10px] text-gray-500 mt-2">Supports .xlsx, .xls, .csv<br/>Col 1: CAD, Col 2: Pressure</span>
            </div>
          </div>
        </section>

        {/* Simulations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#800000]">
              <RotateCcw size={18} />
              <h2 className="font-semibold">TDC Phasing</h2>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
             <input type="number" value={shiftInput} onChange={(e) => setShiftInput(e.target.value)} placeholder="Shift (°)" className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#800000] outline-none" />
             <button onClick={onAddSimulation} className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white transition-colors shadow-md bg-[#800000] hover:bg-[#a00000]">
               <Plus size={16} /> Add
             </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {simulations.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded border border-gray-100">No active simulations.</p>
            )}
            {simulations.map(sim => (
              <SimulationCard key={sim.id} {...sim} isVisible={sim.visible} onDelete={onRemoveSimulation} onToggleVisibility={onToggleVisibility} />
            ))}
          </div>
        </section>
        
         {/* Export */}
         <section className="pt-4 border-t border-gray-100">
           <button onClick={onExportExcel} disabled={simulations.length === 0} className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-all ${simulations.length > 0 ? 'bg-green-600 text-white hover:bg-green-700 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
             <Download size={16} /> Export All Data (Excel)
           </button>
         </section>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs text-gray-600 space-y-2">
        <div className="font-semibold text-gray-800 mb-1">Contact Details:</div>
        <div className="flex items-center gap-2"><div className="font-medium text-[#800000]">Saurabh Singh Chauhan</div></div>
        <div className="flex items-center gap-2 hover:text-[#800000]"><Phone size={12} /> +91 7905020037</div>
        <a href="mailto:saurabhch22@iitk.ac.in" className="flex items-center gap-2 hover:text-[#800000] hover:underline"><Mail size={12} /> saurabhch22@iitk.ac.in</a>
        <a href="https://home.iitk.ac.in/~saurabhch22/" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[#800000] hover:underline"><Globe size={12} /> home.iitk.ac.in/~saurabhch22</a>
        <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-center text-gray-400">&copy; {new Date().getFullYear()} Engine Research Lab, IITK</div>
      </div>
    </aside>
  );
};