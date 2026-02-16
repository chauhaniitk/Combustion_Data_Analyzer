import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Activity, Flame, BookOpen, TableProperties, TrendingUp, Layers, Repeat, Grid } from 'lucide-react';
import { calculateCombustionData } from './utils/engineMath';
import { PhysicsInfo } from './components/PhysicsInfo';
import { SimulationCase, FilterType, EngineParams, DataPoint } from './types';
import { exportToExcel } from './utils/fileUtils';
import { ControlSidebar } from './components/ControlSidebar';
import { CombustionChart } from './components/CombustionChart';
import { ResultsTable } from './components/ResultsTable';

const App: React.FC = () => {
  // --- State ---
  // Updated Defaults for your 4000RPM Engine
  const [engineParams, setEngineParams] = useState<EngineParams>({
    rc: 9.9,
    conRodLength: 94,
    sweptVolume: 97.2,
    stroke: 49.5,
  });

  const [rawData, setRawData] = useState<DataPoint[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [simulations, setSimulations] = useState<SimulationCase[]>([]);
  const [shiftInput, setShiftInput] = useState<string>('0');
  const [gamma, setGamma] = useState<number>(1.33);
  const [smoothing, setSmoothing] = useState<number>(2); // Moving-average half window in points
  const [filterType, setFilterType] = useState<FilterType>('movingAverage');
  const [sgWindowSize, setSgWindowSize] = useState<number>(7);
  const [sgPolynomialOrder, setSgPolynomialOrder] = useState<number>(3);

  // New State for Calculation Window
  const [calcRange, setCalcRange] = useState<{ start: number, end: number }>({ start: -30, end: 90 });

  const [activeTab, setActiveTab] = useState<'pressure' | 'hrr' | 'ropr' | 'chr' | 'pv' | 'logpv' | 'results'>('pressure');
  const [showPhysics, setShowPhysics] = useState(false);

  // --- Load Sample Data on Startup ---
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        const response = await fetch('/sample_data.csv');
        if (!response.ok) return;

        const text = await response.text();
        const rows = text.split('\n').map(row => row.split(','));
        const parsedData: DataPoint[] = [];

        rows.forEach(row => {
          if (row.length >= 2) {
            const cad = parseFloat(row[0]);
            const pressure = parseFloat(row[1]);
            if (!isNaN(cad) && !isNaN(pressure)) {
              parsedData.push({ cad, pressure });
            }
          }
        });

        if (parsedData.length > 0) {
          parsedData.sort((a, b) => a.cad - b.cad);
          setRawData(parsedData);
          setFileName('Sample Data (Default)');
        }
      } catch (err) {
        console.log("No sample data found.");
      }
    };

    loadSampleData();
  }, []);

  // --- Reactive Calculation Effect ---
  // Re-calculates all simulations when global physics parameters change
  useEffect(() => {
    if (!rawData || simulations.length === 0) return;

    setSimulations(prevSims => prevSims.map(sim => {
      const resultsObj = calculateCombustionData(
        rawData,
        engineParams,
        sim.shift,
        gamma,
        smoothing,
        filterType,
        sgWindowSize,
        sgPolynomialOrder,
        calcRange.start, // Removed the previous hardcoded values
        calcRange.end
      );
      return {
        ...sim,
        data: resultsObj.points,
        metrics: resultsObj.metrics
      };
    }));
  }, [gamma, smoothing, filterType, sgWindowSize, sgPolynomialOrder, engineParams, calcRange]);

  // --- Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (typeof bstr !== 'string' && !(bstr instanceof ArrayBuffer)) return;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number)[][];
      const parsedData: DataPoint[] = [];
      data.forEach((row) => {
        if (row.length >= 2) {
          const cad = parseFloat(String(row[0]));
          const pressure = parseFloat(String(row[1]));
          if (!isNaN(cad) && !isNaN(pressure)) parsedData.push({ cad, pressure });
        }
      });
      parsedData.sort((a, b) => a.cad - b.cad);
      setRawData(parsedData);
      setSimulations([]);
    };
    reader.readAsBinaryString(file);
  };

  const addSimulation = () => {
    if (!rawData) {
      alert("Please import a pressure data file.");
      return;
    }
    const shift = parseFloat(shiftInput);
    if (isNaN(shift)) return;

    // Pass gamma and smoothing window
    const resultsObj = calculateCombustionData(
      rawData,
      engineParams,
      shift,
      gamma,
      smoothing,
      filterType,
      sgWindowSize,
      sgPolynomialOrder,
      calcRange.start,
      calcRange.end
    );

    const color = getSimulationColor(simulations.length);
    const newCase: SimulationCase = {
      id: Date.now().toString(),
      shift,
      data: resultsObj.points,
      metrics: resultsObj.metrics,
      color: color,
      visible: true,
    };
    setSimulations([...simulations, newCase]);
    setShiftInput('0');
  };

  const handleParamChange = (field: keyof EngineParams, value: string) => {
    setEngineParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const getSimulationColor = (index: number) => {
    const COLORS = ['#800000', '#21409A', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#4f46e5'];
    return COLORS[index % COLORS.length];
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans text-gray-900">
      <ControlSidebar
        engineParams={engineParams}
        onParamChange={handleParamChange}
        gamma={gamma}
        setGamma={setGamma}
        onFileUpload={handleFileUpload}
        fileName={fileName}
        shiftInput={shiftInput}
        setShiftInput={setShiftInput}
        onAddSimulation={addSimulation}
        hasRawData={!!rawData}
        simulations={simulations}
        onRemoveSimulation={(id) => setSimulations(simulations.filter(s => s.id !== id))}
        onToggleVisibility={(id) => setSimulations(simulations.map(s => s.id === id ? { ...s, visible: !s.visible } : s))}
        onExportExcel={() => simulations.length > 0 && exportToExcel(simulations)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <div className="bg-white border-b border-gray-200 px-6 pt-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex gap-6 overflow-x-auto pb-4">
            {[
              { id: 'pv', icon: Repeat, label: 'P-V' },
              { id: 'logpv', icon: Grid, label: 'Log P-V' },
              { id: 'pressure', icon: Activity, label: 'P-θ' },
              { id: 'ropr', icon: TrendingUp, label: 'RoPR' },
              { id: 'hrr', icon: Flame, label: 'HRR' },
              { id: 'chr', icon: Layers, label: 'CHR' },
              { id: 'results', icon: TableProperties, label: 'Results' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === tab.id ? 'border-[#800000] text-[#800000]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab.icon && <tab.icon size={16} />}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {/* Calculation Range Inputs (Visible on relevant tabs) */}
            {(activeTab === 'chr' || activeTab === 'results' || activeTab === 'hrr') && (
              <div className="flex flex-col items-center justify-center gap-0.5 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Combustion Window</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" className="w-12 p-0 text-center text-xs border rounded outline-none bg-white text-gray-700 h-4"
                    value={calcRange.start}
                    onChange={(e) => setCalcRange(prev => ({ ...prev, start: parseFloat(e.target.value) || 0 }))}
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number" className="w-12 p-0 text-center text-xs border rounded outline-none bg-white text-gray-700 h-4"
                    value={calcRange.end}
                    onChange={(e) => setCalcRange(prev => ({ ...prev, end: parseFloat(e.target.value) || 0 }))}
                  />
                  <span className="text-gray-400 text-xs">&deg;</span>
                </div>
              </div>
            )}

            <button onClick={() => setShowPhysics(true)} className="mb-4 text-sm bg-red-50 text-[#800000] px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-red-100 transition-colors font-medium border border-red-200">
              <BookOpen size={16} /> Methodology
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 relative">
          {simulations.length > 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full p-4 relative flex flex-col">
              <div className="flex-1 min-h-0">
                {activeTab === 'results' ? (
                  <ResultsTable simulations={simulations} />
                ) : (
                  <CombustionChart
                    activeTab={activeTab}
                    simulations={simulations}
                    rawData={rawData}
                    smoothing={smoothing}
                    setSmoothing={setSmoothing}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    sgWindowSize={sgWindowSize}
                    setSgWindowSize={setSgWindowSize}
                    sgPolynomialOrder={sgPolynomialOrder}
                    setSgPolynomialOrder={setSgPolynomialOrder}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed">
              <div className="bg-red-50 p-6 rounded-full mb-4"><Activity size={48} className="text-red-300" /></div>
              <p className="text-xl font-bold text-gray-600">No Data Loaded</p>
              <p className="text-sm mt-2 max-w-md text-center">
                {fileName ? "File Loaded. Add a simulation case to begin." : "Upload your pressure data file."}
              </p>
            </div>
          )}
        </div>

        <PhysicsInfo isOpen={showPhysics} onClose={() => setShowPhysics(false)} />
      </main>
    </div>
  );
};

export default App;
