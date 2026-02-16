import React from 'react';
import { SimulationCase } from '../types';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ResultsTableProps {
  simulations: SimulationCase[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ simulations }) => {
  if (simulations.length === 0) return null;

  const exportSummary = () => {
    const data = simulations.map(sim => ({
      'Shift (°)': sim.shift,
      'P_max (bar)': sim.metrics.peakPressure.toFixed(2),
      'at CAD': sim.metrics.peakPressureCad.toFixed(1),
      'HRR_max (J/deg)': sim.metrics.peakHrr.toFixed(2),
      'at CAD ': sim.metrics.peakHrrCad.toFixed(1),
      'RoPR_max (bar/deg)': sim.metrics.peakRoPR.toFixed(2),
      'IMEP (bar)': sim.metrics.imep.toFixed(3),
      'CA10 (°)': sim.metrics.ca10,
      'CA50 (°)': sim.metrics.ca50,
      'CA90 (°)': sim.metrics.ca90,
      'Burn Duration': sim.metrics.combustionDuration
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary_Results");
    XLSX.writeFile(wb, `Combustion_Summary_${Date.now()}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-800">Indicative Parameters & Results</h3>
        <button 
          onClick={exportSummary}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
        >
          <Download size={14} /> Export Table
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">P<sub>max</sub></th>
              <th className="px-4 py-3">@ (&deg;)</th>
              <th className="px-4 py-3">HRR<sub>max</sub></th>
              <th className="px-4 py-3">@ (&deg;)</th>
              <th className="px-4 py-3">RoPR<sub>max</sub></th>
              <th className="px-4 py-3">IMEP</th>
              <th className="px-4 py-3">CA10</th>
              <th className="px-4 py-3">CA50</th>
              <th className="px-4 py-3">CA90</th>
            </tr>
          </thead>
          <tbody>
            {simulations.map((sim) => (
              <tr key={sim.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: sim.color}}></div>
                  {sim.shift > 0 ? `+${sim.shift}` : sim.shift}&deg;
                </td>
                <td className="px-4 py-3">{sim.metrics.peakPressure.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">{sim.metrics.peakPressureCad.toFixed(1)}</td>
                <td className="px-4 py-3">{sim.metrics.peakHrr.toFixed(1)}</td>
                <td className="px-4 py-3 text-gray-500">{sim.metrics.peakHrrCad.toFixed(1)}</td>
                <td className="px-4 py-3">{sim.metrics.peakRoPR.toFixed(2)}</td>
                <td className="px-4 py-3 font-bold text-gray-800">{sim.metrics.imep.toFixed(3)}</td>
                <td className="px-4 py-3">{sim.metrics.ca10 ?? '-'}</td>
                <td className="px-4 py-3">{sim.metrics.ca50 ?? '-'}</td>
                <td className="px-4 py-3">{sim.metrics.ca90 ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};