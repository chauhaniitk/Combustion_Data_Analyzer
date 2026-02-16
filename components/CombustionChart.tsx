import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Customized, ReferenceLine
} from 'recharts';
import { Camera, ZoomIn, ZoomOut, RefreshCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { SimulationCase, FilterType } from '../types';

/**
 * ROBUST DOWNLOADER
 */
const downloadChartWithStyles = (containerId: string, title: string) => {
  const container = document.getElementById(containerId);
  const originalSvg = container?.querySelector('.recharts-surface') as SVGSVGElement;
  if (!originalSvg) return;

  const clone = originalSvg.cloneNode(true) as SVGSVGElement;
  const box = originalSvg.getBoundingClientRect();
  clone.setAttribute('width', box.width.toString());
  clone.setAttribute('height', box.height.toString());
  clone.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  clone.style.backgroundColor = '#ffffff';

  const originalNodes = originalSvg.querySelectorAll('*');
  const cloneNodes = clone.querySelectorAll('*');

  originalNodes.forEach((node, i) => {
    const cloneNode = cloneNodes[i];
    if (node instanceof Element && cloneNode instanceof Element) {
      const computed = window.getComputedStyle(node);
      if (computed.stroke !== 'none') cloneNode.setAttribute('stroke', computed.stroke);
      if (computed.fill !== 'none') cloneNode.setAttribute('fill', computed.fill);
      if (computed.strokeWidth !== '0px') cloneNode.setAttribute('stroke-width', computed.strokeWidth);
      if (computed.opacity !== '1') cloneNode.setAttribute('opacity', computed.opacity);
      cloneNode.setAttribute('font-family', computed.fontFamily);
      cloneNode.setAttribute('font-size', computed.fontSize);
      cloneNode.setAttribute('font-weight', computed.fontWeight);
    }
  });

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Smart Header Component ---
const ChartHeader = (props: any) => {
  const { width, title, simulations } = props;
  const visibleSims = simulations.filter((s: any) => s.visible);

  const itemWidth = 110;
  const totalLegendWidth = visibleSims.length * itemWidth;
  let startX = (width || 800) - totalLegendWidth - 30;

  const titleSafetyZone = 300;
  if (startX < titleSafetyZone) startX = titleSafetyZone;

  return (
    <g>
      <text x={70} y={20} fill="#333" textAnchor="start" dominantBaseline="central" fontWeight="bold" fontSize="16">
        {title}
      </text>
      {visibleSims.map((sim: any, i: number) => (
        <g key={sim.id} transform={`translate(${startX + (i * itemWidth)}, 20)`}>
          <line x1={0} y1={0} x2={20} y2={0} stroke={sim.color} strokeWidth={3} />
          <text x={25} y={0} dy={4} fill="#555" fontSize="12" fontWeight="500">
            {`Shift ${sim.shift}°`}
          </text>
        </g>
      ))}
    </g>
  );
};

// --- UNIFIED LAYOUT CONSTANTS ---
const CHART_MARGINS = {
  top: 35,
  right: 80,
  bottom: 80,
  left: 80,
};

// --- SMART FORMATTER ---
const formatValue = (val: number) => {
  if (val === 0) return "0";
  // Rule: Limit decimals to 4
  if (Math.abs(val) < 0.01 || Math.abs(val) >= 100000) {
    return val.toExponential(4);
  }
  if (Number.isInteger(val)) return val.toString();
  return parseFloat(val.toFixed(4)).toString();
};

const niceNum = (range: number, round: boolean): number => {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction = 1;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
};

const buildNiceTicks = (min: number, max: number, approxCount = 8, preferZero = false): number[] => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];

  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const range = hi - lo;
  const step = niceNum(range / Math.max(2, approxCount - 1), true);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  const maxIter = 200;
  for (let i = 0; i < maxIter; i++) {
    const tick = start + i * step;
    if (tick > end + step * 0.5) break;
    ticks.push(Math.abs(tick) < 1e-12 ? 0 : parseFloat(tick.toFixed(12)));
  }

  const eps = step * 1e-6;
  const inRangeTicks = ticks.filter((t) => t >= lo - eps && t <= hi + eps);

  if (preferZero && lo < 0 && hi > 0 && !inRangeTicks.some((t) => Math.abs(t) < 1e-12)) {
    inRangeTicks.push(0);
  }
  inRangeTicks.sort((a, b) => a - b);

  return inRangeTicks;
};

const getPlotRectFromSvg = (container: HTMLDivElement | null) => {
  const svg = container?.querySelector('.recharts-surface') as SVGSVGElement | null;
  if (!svg) return null;

  const clipped = svg.querySelector('[clip-path]') as SVGElement | null;
  const clipPathValue = clipped?.getAttribute('clip-path');
  if (!clipPathValue) return null;

  const match = clipPathValue.match(/url\(#([^)]+)\)/);
  if (!match) return null;

  const rect = svg.querySelector(`#${match[1]} rect`) as SVGRectElement | null;
  if (!rect) return null;

  const x = Number(rect.getAttribute('x'));
  const y = Number(rect.getAttribute('y'));
  const width = Number(rect.getAttribute('width'));
  const height = Number(rect.getAttribute('height'));

  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
};

interface CombustionChartProps {
  activeTab: 'pressure' | 'hrr' | 'ropr' | 'chr' | 'pv' | 'logpv';
  simulations: SimulationCase[];
  rawData: any[] | null;
  smoothing: number;
  setSmoothing: (val: number) => void;
  filterType: FilterType;
  setFilterType: (val: FilterType) => void;
  sgWindowSize: number;
  setSgWindowSize: (val: number) => void;
  sgPolynomialOrder: number;
  setSgPolynomialOrder: (val: number) => void;
  calcRange?: { start: number, end: number };
}

export const CombustionChart: React.FC<CombustionChartProps> = ({
  activeTab,
  simulations,
  rawData,
  smoothing,
  setSmoothing,
  filterType,
  setFilterType,
  sgWindowSize,
  setSgWindowSize,
  sgPolynomialOrder,
  setSgPolynomialOrder,
  calcRange
}) => {
  // Zoom State
  const [left, setLeft] = useState<number | 'auto'>('auto');
  const [right, setRight] = useState<number | 'auto'>('auto');
  const [top, setTop] = useState<number | 'auto'>('auto');
  const [bottom, setBottom] = useState<number | 'auto'>('auto');

  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [refAreaTop, setRefAreaTop] = useState<number | null>(null);
  const [refAreaBottom, setRefAreaBottom] = useState<number | null>(null);
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null);
  const [cursorPixel, setCursorPixel] = useState<{ x: number; y: number } | null>(null);
  const [plotRect, setPlotRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [snapTooltip, setSnapTooltip] = useState<{ x: number; y: number; xVal: number; yVal: number } | null>(null);

  const [localSmoothing, setLocalSmoothing] = useState<string | number>(smoothing);
  const [localSgWindowSize, setLocalSgWindowSize] = useState<string | number>(sgWindowSize);
  const [localSgPolynomialOrder, setLocalSgPolynomialOrder] = useState<string | number>(sgPolynomialOrder);

  const chartWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSmoothing(smoothing);
  }, [smoothing]);

  useEffect(() => {
    setLocalSgWindowSize(sgWindowSize);
  }, [sgWindowSize]);

  useEffect(() => {
    setLocalSgPolynomialOrder(sgPolynomialOrder);
  }, [sgPolynomialOrder]);

  const handleSmoothingCommit = () => {
    const val = Number(localSmoothing);
    if (!isNaN(val) && val >= 0) {
      setSmoothing(Math.floor(val));
    } else {
      setLocalSmoothing(smoothing);
    }
  };

  const handleSgWindowCommit = () => {
    const val = Number(localSgWindowSize);
    if (!isNaN(val) && val >= 3) {
      setSgWindowSize(Math.floor(val));
    } else {
      setLocalSgWindowSize(sgWindowSize);
    }
  };

  const handleSgPolynomialOrderCommit = () => {
    const val = Number(localSgPolynomialOrder);
    if (!isNaN(val) && val >= 1) {
      setSgPolynomialOrder(Math.floor(val));
    } else {
      setLocalSgPolynomialOrder(sgPolynomialOrder);
    }
  };

  const handleSgCommit = () => {
    handleSgWindowCommit();
    handleSgPolynomialOrderCommit();
  };

  const getKeys = () => {
    let xKey = 'cad';
    let yKey = activeTab as string;

    if (activeTab === 'hrr') yKey = 'hrrFiltered';
    if (activeTab === 'ropr') yKey = 'roprFiltered';
    if (activeTab === 'pv') { xKey = 'volume'; yKey = 'pressure'; }
    if (activeTab === 'logpv') { xKey = 'logV'; yKey = 'logP'; }
    return { xKey, yKey };
  };

  const { xKey, yKey } = getKeys();

  // --- FILTERING LOGIC ---
  const processedSimulations = simulations.map(sim => {
    let filteredData = sim.data;
    if (activeTab === 'chr' && calcRange) {
      // STRICT FILTER: Remove data outside range
      filteredData = sim.data.filter(d => d.cad >= calcRange.start && d.cad <= calcRange.end);
    }
    return { ...sim, data: filteredData };
  });

  // --- Zoom Logic ---
  const zoom = () => {
    if (refAreaLeft === null || refAreaRight === null || refAreaLeft === refAreaRight) {
      resetZoomState();
      return;
    }
    let x1 = Number(refAreaLeft);
    let x2 = Number(refAreaRight);
    let y1 = refAreaBottom;
    let y2 = refAreaTop;

    if (x1 > x2) [x1, x2] = [x2, x1];

    let finalBottom: number | 'auto' = 'auto';
    let finalTop: number | 'auto' = 'auto';

    if (y1 === null || y2 === null || y1 === y2) {
      let minDataY = Infinity;
      let maxDataY = -Infinity;

      const casesToCheck = processedSimulations.flatMap(s => s.data);

      let hasData = false;
      casesToCheck.forEach(pt => {
        // @ts-ignore
        const xVal = pt[xKey];
        // @ts-ignore
        const yVal = pt[yKey];
        if (xVal >= x1 && xVal <= x2 && typeof yVal === 'number') {
          if (yVal < minDataY) minDataY = yVal;
          if (yVal > maxDataY) maxDataY = yVal;
          hasData = true;
        }
      });

      if (hasData) {
        const padding = (maxDataY - minDataY) * 0.05;
        finalBottom = minDataY - padding;
        finalTop = maxDataY + padding;
      }
    } else {
      let val1 = Number(y1);
      let val2 = Number(y2);
      if (val1 > val2) [val1, val2] = [val2, val1];
      finalBottom = val1;
      finalTop = val2;
    }

    setLeft(x1);
    setRight(x2);
    setBottom(finalBottom);
    setTop(finalTop);
    resetZoomState();
  };

  const resetZoomState = () => {
    setRefAreaLeft(null); setRefAreaRight(null); setRefAreaTop(null); setRefAreaBottom(null);
  };

  const resetZoom = () => {
    setLeft('auto'); setRight('auto'); setTop('auto'); setBottom('auto');
    resetZoomState();
  };

  const getDomain = (key: string) => {
    const casesToCheck = processedSimulations.flatMap(s => s.data);

    if (casesToCheck.length === 0) return { min: 0, max: 100 };

    let min = Infinity; let max = -Infinity;
    for (const p of casesToCheck) {
      // @ts-ignore
      const val = p[key];
      if (val !== undefined && typeof val === 'number') {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    return (min === Infinity) ? { min: 0, max: 100 } : { min, max };
  };

  const zoomIn = () => {
    let currentL = left === 'auto' ? getDomain(xKey).min : Number(left);
    let currentR = right === 'auto' ? getDomain(xKey).max : Number(right);
    const rangeX = currentR - currentL;
    const paddingX = rangeX * 0.1;
    setLeft(currentL + paddingX);
    setRight(currentR - paddingX);

    let currentB = bottom === 'auto' ? getDomain(yKey).min : Number(bottom);
    let currentT = top === 'auto' ? getDomain(yKey).max : Number(top);
    const rangeY = currentT - currentB;
    const paddingY = rangeY * 0.1;
    setBottom(currentB + paddingY);
    setTop(currentT - paddingY);
  };

  const zoomOut = () => {
    let currentL = left === 'auto' ? getDomain(xKey).min : Number(left);
    let currentR = right === 'auto' ? getDomain(xKey).max : Number(right);
    const rangeX = currentR - currentL;
    const paddingX = rangeX * 0.2;
    setLeft(currentL - paddingX);
    setRight(currentR + paddingX);

    let currentB = bottom === 'auto' ? getDomain(yKey).min : Number(bottom);
    let currentT = top === 'auto' ? getDomain(yKey).max : Number(top);
    const rangeY = currentT - currentB;
    const paddingY = rangeY * 0.2;
    setBottom(currentB - paddingY);
    setTop(currentT + paddingY);
  };

  const pan = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (direction === 'left' || direction === 'right') {
      let currentL = left === 'auto' ? getDomain(xKey).min : Number(left);
      let currentR = right === 'auto' ? getDomain(xKey).max : Number(right);
      const range = currentR - currentL;
      const shift = range * 0.1;
      if (direction === 'left') { setLeft(currentL - shift); setRight(currentR - shift); }
      else { setLeft(currentL + shift); setRight(currentR + shift); }
    }
    if (direction === 'up' || direction === 'down') {
      let currentB = bottom === 'auto' ? getDomain(yKey).min : Number(bottom);
      let currentT = top === 'auto' ? getDomain(yKey).max : Number(top);
      const range = currentT - currentB;
      const shift = range * 0.1;
      if (direction === 'down') { setBottom(currentB - shift); setTop(currentT - shift); }
      else { setBottom(currentB + shift); setTop(currentT + shift); }
    }
  };

  let yLabel = 'Value'; let title = 'Chart';
  let xLabel = 'Crank Angle (°)';

  if (activeTab === 'pressure') { yLabel = 'Pressure (bar)'; title = 'In-Cylinder Pressure'; }
  else if (activeTab === 'hrr') { yLabel = 'HRR (J/deg)'; title = 'Heat Release Rate'; }
  else if (activeTab === 'ropr') { yLabel = 'RoPR (bar/deg)'; title = 'Rate of Pressure Rise'; }
  else if (activeTab === 'chr') { yLabel = 'Cum. Heat (J)'; title = 'Cumulative Heat Release'; }
  else if (activeTab === 'pv') { xLabel = 'Volume (cc)'; yLabel = 'Pressure (bar)'; title = 'P-V Diagram'; }
  else if (activeTab === 'logpv') { xLabel = 'Log Volume'; yLabel = 'Log Pressure'; title = 'Log P - Log V Diagram'; }

  const xAxisFormatter = (val: number) => {
    if (activeTab === 'pv') {
      return formatValue(val * 1e6);
    }
    return formatValue(val);
  };

  // --- Determine default X domain ---
  // If CHR, strict snap to window. Otherwise standard Data Min/Max.
  let defaultXMin: string | number = 'dataMin';
  let defaultXMax: string | number = 'dataMax';

  if (activeTab === 'chr' && calcRange) {
    defaultXMin = calcRange.start;
    defaultXMax = calcRange.end;
  }

  const isCadAxis = activeTab === 'pressure' || activeTab === 'hrr' || activeTab === 'ropr' || activeTab === 'chr';
  const xDataDomain = getDomain(xKey);
  const xDomainMin = left === 'auto'
    ? (typeof defaultXMin === 'number' ? defaultXMin : xDataDomain.min)
    : Number(left);
  const xDomainMax = right === 'auto'
    ? (typeof defaultXMax === 'number' ? defaultXMax : xDataDomain.max)
    : Number(right);
  const yDataDomain = getDomain(yKey);
  const yDomainMin = bottom === 'auto' ? yDataDomain.min : Number(bottom);
  const yDomainMax = top === 'auto' ? yDataDomain.max : Number(top);
  const xTicks = isCadAxis ? buildNiceTicks(xDomainMin, xDomainMax, 8, true) : undefined;

  return (
    <div className="h-full w-full flex flex-col" id="chart-container">
      {/* TOOLBAR */}
      <div className="flex justify-end items-center mb-1 px-1 bg-white border-b border-gray-100 pb-1">
        <div className="mr-auto flex items-center gap-1 min-w-0">
          {(activeTab === 'hrr' || activeTab === 'ropr') && (
            <div className="flex items-center flex-wrap gap-1 bg-white px-1.5 py-1 rounded border border-gray-200 text-[11px]">
              <span className="text-gray-600 font-semibold">Filter</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="h-6 px-1 border border-gray-300 rounded bg-white text-gray-700"
              >
                <option value="unfiltered">Unfiltered</option>
                <option value="movingAverage">Window Average</option>
                <option value="savitzkyGolay">Savitzky-Golay</option>
              </select>

              {filterType === 'movingAverage' && (
                <>
                  <span className="text-gray-600">W:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localSmoothing}
                    onChange={(e) => setLocalSmoothing(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSmoothingCommit(); }}
                    className="w-11 h-6 px-1 border border-gray-300 rounded text-center focus:border-red-500 outline-none"
                  />
                  <button onClick={handleSmoothingCommit} className="h-6 px-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 border border-gray-300">Apply</button>
                </>
              )}

              {filterType === 'savitzkyGolay' && (
                <>
                  <span className="text-gray-600">W:</span>
                  <input
                    type="number"
                    min="3"
                    value={localSgWindowSize}
                    onChange={(e) => setLocalSgWindowSize(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSgCommit(); }}
                    className="w-11 h-6 px-1 border border-gray-300 rounded text-center focus:border-red-500 outline-none"
                  />
                  <span className="text-gray-600">P:</span>
                  <input
                    type="number"
                    min="1"
                    value={localSgPolynomialOrder}
                    onChange={(e) => setLocalSgPolynomialOrder(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSgCommit(); }}
                    className="w-11 h-6 px-1 border border-gray-300 rounded text-center focus:border-red-500 outline-none"
                  />
                  <button onClick={handleSgCommit} className="h-6 px-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 border border-gray-300">Apply</button>
                  <span className="text-[10px] text-gray-500">odd W, P &lt; W</span>
                  <span className="basis-full text-[10px] text-gray-500 -mt-0.5">W = window length, P = polynomial order</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded border border-gray-200">
          <button onClick={resetZoom} className="p-1 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Reset View"><RefreshCcw size={14} /></button>

          <div className="flex items-center gap-2 px-2 border-l border-r border-gray-200 mx-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500">X</span>
              <input type="number" placeholder="Min" className="w-10 text-[10px] p-0.5 border rounded outline-none text-right" value={left === 'auto' ? '' : Math.round(left)} onChange={(e) => setLeft(e.target.value === '' ? 'auto' : Number(e.target.value))} />
              <input type="number" placeholder="Max" className="w-10 text-[10px] p-0.5 border rounded outline-none text-right" value={right === 'auto' ? '' : Math.round(right)} onChange={(e) => setRight(e.target.value === '' ? 'auto' : Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-500">Y</span>
              <input type="number" placeholder="Min" className="w-10 text-[10px] p-0.5 border rounded outline-none text-right" value={bottom === 'auto' ? '' : Math.round(bottom)} onChange={(e) => setBottom(e.target.value === '' ? 'auto' : Number(e.target.value))} />
              <input type="number" placeholder="Max" className="w-10 text-[10px] p-0.5 border rounded outline-none text-right" value={top === 'auto' ? '' : Math.round(top)} onChange={(e) => setTop(e.target.value === '' ? 'auto' : Number(e.target.value))} />
            </div>
          </div>

          <button onClick={zoomOut} className="p-1 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Zoom Out (Locked Aspect)"><ZoomOut size={14} /></button>

          <button onClick={() => pan('left')} className="p-1 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Pan Left"><ArrowLeft size={14} /></button>
          <div className="flex flex-col items-center gap-0.5">
            <button onClick={() => pan('up')} className="p-0.5 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Pan Up"><ArrowUp size={10} /></button>
            <button onClick={zoomIn} className="p-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors border border-gray-300" title="Zoom In (Center)"><ZoomIn size={10} /></button>
            <button onClick={() => pan('down')} className="p-0.5 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Pan Down"><ArrowDown size={10} /></button>
          </div>
          <button onClick={() => pan('right')} className="p-1 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Pan Right"><ArrowRight size={14} /></button>

          <div className="w-px h-3 bg-gray-300 mx-1"></div>
          <button onClick={() => downloadChartWithStyles('chart-container', title)} className="p-1 hover:bg-[#ffebee] text-[#800000] rounded transition-colors" title="Download SVG (Vector)"><Camera size={14} /></button>
        </div>
      </div>

      {/* PLOT AREA */}
      <div
        className="flex-1 min-h-0 select-none relative"
        ref={chartWrapperRef}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            margin={CHART_MARGINS}
            onMouseDown={(e) => {
              if (e && e.activeLabel) {
                setRefAreaLeft(Number(e.activeLabel));
                if (e.activePayload && e.activePayload.length > 0) setRefAreaBottom(Number(e.activePayload[0].payload[yKey]));
              }
            }}
            onMouseMove={(e) => {
              const chartX = typeof e?.chartX === 'number' ? e.chartX : e?.activeCoordinate?.x;
              const chartY = typeof e?.chartY === 'number' ? e.chartY : e?.activeCoordinate?.y;
              const currentPlotRect = getPlotRectFromSvg(chartWrapperRef.current);
              const plotX = currentPlotRect?.x ?? CHART_MARGINS.left;
              const plotY = currentPlotRect?.y ?? CHART_MARGINS.top;
              const plotWidth = currentPlotRect?.width ?? 0;
              const plotHeight = currentPlotRect?.height ?? 0;

              if (
                typeof chartX === 'number' &&
                typeof chartY === 'number' &&
                plotWidth > 1 &&
                plotHeight > 1 &&
                xDomainMax !== xDomainMin &&
                yDomainMax !== yDomainMin
              ) {
                setPlotRect({ x: plotX, y: plotY, width: plotWidth, height: plotHeight });

                const clampedX = Math.max(plotX, Math.min(plotX + plotWidth, chartX));
                const clampedY = Math.max(plotY, Math.min(plotY + plotHeight, chartY));

                const rx = Math.max(0, Math.min(1, (chartX - plotX) / plotWidth));
                const ry = Math.max(0, Math.min(1, (chartY - plotY) / plotHeight));
                const xVal = xDomainMin + rx * (xDomainMax - xDomainMin);
                const yVal = yDomainMax - ry * (yDomainMax - yDomainMin);

                // Free mouse/crosshair coordinates (independent of curve snap)
                setCursorPixel({ x: clampedX, y: clampedY });
                setCursorPoint({ x: xVal, y: yVal });

                // Curve-point tooltip: must come from active payload (red-dot value), not mouse.
                const activeIdxRaw = e?.activeTooltipIndex ?? e?.activeIndex;
                const activeIdx = typeof activeIdxRaw === 'number' ? activeIdxRaw : Number(activeIdxRaw);
                const snapX = e?.activeCoordinate?.x;
                const visibleCandidates = processedSimulations.filter((s) => s.visible);

                if (Number.isFinite(activeIdx) && visibleCandidates.length > 0) {
                  // Pick the visible curve point closest to current mouse y, so the box tracks a red dot on a curve.
                  let best:
                    | { xVal: number; yVal: number; yPixel: number }
                    | null = null;
                  let bestDist = Infinity;

                  for (const sim of visibleCandidates) {
                    const pt = sim.data[activeIdx];
                    if (!pt) continue;
                    // @ts-ignore dynamic key access for chart mode
                    const yCandidate = Number(pt[yKey]);
                    // @ts-ignore dynamic key access for chart mode
                    const xCandidate = Number(pt[xKey]);
                    if (!Number.isFinite(xCandidate) || !Number.isFinite(yCandidate)) continue;

                    const yPixel = plotY + ((yDomainMax - yCandidate) / (yDomainMax - yDomainMin)) * plotHeight;
                    const dist = Math.abs(yPixel - clampedY);
                    if (dist < bestDist) {
                      bestDist = dist;
                      best = { xVal: xCandidate, yVal: yCandidate, yPixel };
                    }
                  }

                  if (best) {
                    const snapXPixel = typeof snapX === 'number'
                      ? snapX
                      : plotX + ((best.xVal - xDomainMin) / (xDomainMax - xDomainMin)) * plotWidth;
                    const clampedSnapX = Math.max(plotX, Math.min(plotX + plotWidth, snapXPixel));
                    const clampedSnapY = Math.max(plotY, Math.min(plotY + plotHeight, best.yPixel));
                    const tipX = Math.max(plotX + 8, Math.min(plotX + plotWidth - 120, clampedSnapX + 14));
                    const tipY = Math.max(plotY + 8, Math.min(plotY + plotHeight - 40, clampedSnapY - 14));
                    setSnapTooltip({ x: tipX, y: tipY, xVal: best.xVal, yVal: best.yVal });
                  } else {
                    setSnapTooltip(null);
                  }
                } else {
                  setSnapTooltip(null);
                }
              } else {
                setCursorPoint(null);
                setCursorPixel(null);
                setSnapTooltip(null);
              }

              if (refAreaLeft !== null && e && e.activeLabel) {
                setRefAreaRight(Number(e.activeLabel));
                if (e.activePayload && e.activePayload.length > 0) {
                  setRefAreaTop(Number(e.activePayload[0].payload[yKey]));
                }
              }
            }}
            onMouseLeave={() => {
              setCursorPoint(null);
              setCursorPixel(null);
              setSnapTooltip(null);
            }}
            onMouseUp={zoom}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <Customized component={<ChartHeader title={title} simulations={processedSimulations} />} />

            <XAxis
              type="number"
              dataKey={xKey}
              // Force X domain to match calculation window in CHR mode
              domain={[left === 'auto' ? defaultXMin : left, right === 'auto' ? defaultXMax : right]}
              allowDataOverflow
              label={{ value: xLabel, position: 'bottom', offset: 0 }}
              tick={{ fontSize: 12 }}
              ticks={xTicks}
              tickFormatter={xAxisFormatter}
              padding={{ left: 20, right: 20 }} // Added padding to prevent axis touching
            />
            <YAxis
              domain={[bottom, top]}
              allowDataOverflow
              label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10 }}
              tick={{ fontSize: 12 }}
              tickFormatter={formatValue}
              padding={{ top: 20, bottom: 20 }} // Added padding to prevent axis touching
            />

            <Tooltip
              cursor={false}
              content={() => null}
              isAnimationActive={false}
            />

            {isCadAxis && xDomainMin <= 0 && xDomainMax >= 0 && (
              <ReferenceLine x={0} stroke="#64748b" strokeDasharray="4 4" />
            )}

            {processedSimulations.filter(s => s.visible).map((sim) => (
              <Line
                key={sim.id}
                data={sim.data}
                type="monotone"
                dataKey={yKey}
                name={`Shift: ${sim.shift}°`}
                stroke={sim.color}
                strokeWidth={filterType === 'unfiltered' ? 1 : 2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}

            {refAreaLeft !== null && refAreaRight !== null ? (
              <ReferenceArea x1={refAreaLeft} x2={refAreaRight} y1={refAreaBottom ?? undefined} y2={refAreaTop ?? undefined} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
        {cursorPixel && plotRect && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className="absolute bg-slate-400/80"
              style={{ left: cursorPixel.x, top: plotRect.y, width: 1, height: plotRect.height }}
            />
            <div
              className="absolute bg-slate-400/80"
              style={{ left: plotRect.x, top: cursorPixel.y, width: plotRect.width, height: 1 }}
            />
          </div>
        )}
        {cursorPoint && (
          <div className="absolute right-2 top-2 z-20 bg-white/90 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] text-gray-700 shadow-sm pointer-events-none">
            <span className="font-semibold">x:</span> {xAxisFormatter(cursorPoint.x)}&nbsp;
            <span className="font-semibold">y:</span> {formatValue(cursorPoint.y)}
          </div>
        )}
        {snapTooltip && (
          <div
            className="absolute z-20 bg-white/95 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] text-gray-700 shadow-sm pointer-events-none"
            style={{ left: snapTooltip.x, top: snapTooltip.y }}
          >
            <span className="font-semibold">{xLabel}:</span> {xAxisFormatter(snapTooltip.xVal)}&nbsp;
            <span className="font-semibold">{yLabel}:</span> {formatValue(snapTooltip.yVal)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CombustionChart;
