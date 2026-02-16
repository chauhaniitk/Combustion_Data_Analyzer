import { EngineParams, DataPoint, CalculatedPoint, SimulationMetrics, FilterType } from '../types';

// Helper: Smart number formatter for metrics
const fmt = (num: number | null): number | null => {
  if (num === null) return null;
  // If it's effectively an integer (e.g. 10.0000001), treat as integer
  if (Math.abs(num - Math.round(num)) < 1e-6) return Math.round(num);
  // Otherwise limit to 4 decimals
  return parseFloat(num.toFixed(4));
};

// Simple Moving Average Filter
const movingAverage = (data: number[], windowSize: number) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - windowSize);
    const end = Math.min(data.length - 1, i + windowSize);
    for (let j = start; j <= end; j++) {
      sum += data[j];
      count++;
    }
    result.push(sum / count);
  }
  return result;
};

const clampSgParams = (windowSize: number, polynomialOrder: number) => {
  let safeWindow = Math.max(3, Math.floor(windowSize));
  if (safeWindow % 2 === 0) safeWindow += 1;

  let safeOrder = Math.max(1, Math.floor(polynomialOrder));
  if (safeOrder >= safeWindow) safeOrder = safeWindow - 1;

  return { safeWindow, safeOrder };
};

const invertMatrix = (matrix: number[][]): number[][] | null => {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(augmented[r][col]) > Math.abs(augmented[pivot][col])) {
        pivot = r;
      }
    }

    if (Math.abs(augmented[pivot][col]) < 1e-12) return null;
    if (pivot !== col) {
      const tmp = augmented[col];
      augmented[col] = augmented[pivot];
      augmented[pivot] = tmp;
    }

    const pivotVal = augmented[col][col];
    for (let j = 0; j < 2 * n; j++) augmented[col][j] /= pivotVal;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = augmented[r][col];
      for (let j = 0; j < 2 * n; j++) {
        augmented[r][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map((row) => row.slice(n));
};

const reflectIndex = (index: number, length: number): number => {
  if (length <= 1) return 0;
  let idx = index;
  while (idx < 0 || idx >= length) {
    idx = idx < 0 ? -idx : 2 * length - idx - 2;
  }
  return idx;
};

const savitzkyGolay = (data: number[], windowSize: number, polynomialOrder: number): number[] => {
  if (data.length === 0) return [];
  const { safeWindow, safeOrder } = clampSgParams(windowSize, polynomialOrder);
  const half = Math.floor(safeWindow / 2);

  const A: number[][] = [];
  for (let i = -half; i <= half; i++) {
    const row: number[] = [];
    for (let p = 0; p <= safeOrder; p++) row.push(Math.pow(i, p));
    A.push(row);
  }

  const cols = safeOrder + 1;
  const AtA = Array.from({ length: cols }, () => Array(cols).fill(0));
  const At = Array.from({ length: cols }, () => Array(safeWindow).fill(0));

  for (let r = 0; r < safeWindow; r++) {
    for (let c = 0; c < cols; c++) {
      At[c][r] = A[r][c];
    }
  }

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < safeWindow; k++) sum += At[i][k] * A[k][j];
      AtA[i][j] = sum;
    }
  }

  const AtAInv = invertMatrix(AtA);
  if (!AtAInv) return movingAverage(data, Math.floor(safeWindow / 2));

  const coeffs = Array(safeWindow).fill(0);
  for (let j = 0; j < safeWindow; j++) {
    let sum = 0;
    for (let k = 0; k < cols; k++) {
      sum += AtAInv[0][k] * At[k][j];
    }
    coeffs[j] = sum;
  }

  const out = Array(data.length).fill(0);
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < safeWindow; j++) {
      const srcIndex = reflectIndex(i + j - half, data.length);
      sum += coeffs[j] * data[srcIndex];
    }
    out[i] = sum;
  }
  return out;
};

export const calculateCombustionData = (
  data: DataPoint[],
  params: EngineParams,
  shift: number,
  gamma: number = 1.33,
  smoothingWindow: number = 2,
  filterType: FilterType = 'movingAverage',
  sgWindowSize: number = 7,
  sgPolynomialOrder: number = 3,
  calcStart: number = -180, 
  calcEnd: number = 180     
): { points: CalculatedPoint[], metrics: SimulationMetrics } => {
  if (!data || data.length === 0) {
    return { 
      points: [], 
      metrics: { 
        peakPressure: 0, peakPressureCad: 0, peakHrr: 0, peakHrrCad: 0, 
        peakRoPR: 0, peakRoPRCad: 0, imep: 0, 
        ca05: null, ca10: null, ca50: null, ca90: null, combustionDuration: null 
      } 
    };
  }

  // 1. Geometry
  const V_s_m3 = params.sweptVolume * 1e-6;
  const V_c = V_s_m3 / (params.rc - 1);
  const crankRadius = params.stroke / 2.0;
  const R = params.conRodLength / crankRadius;
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  // 2. Pre-calculate Volume & Basic Props
  const points = data.map((pt) => {
    const shiftedCad = pt.cad + shift;
    const theta = degToRad(shiftedCad);
    const term1 = 1 - Math.cos(theta);
    const term2 = Math.sqrt(Math.max(0, R * R - Math.pow(Math.sin(theta), 2)));
    const volume = V_c + (V_s_m3 / 2.0) * (term1 + R - term2);
    return { ...pt, cad: shiftedCad, volume };
  });

  // 3. Main Loop (Derivatives & Thermodynamics)
  const tempResults: any[] = [];
  let cumulativeHeat = 0;
  let workSum = 0; 
  let maxP = -Infinity;
  let maxPCad = 0;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    
    if (current.pressure > maxP) {
      maxP = current.pressure;
      maxPCad = current.cad;
    }

    const prev = i > 0 ? points[i-1] : current;
    
    let dTheta = current.cad - prev.cad;
    if (dTheta === 0) dTheta = 0.1;

    // Derivatives
    const dV = (current.volume - prev.volume) / dTheta;
    const dP_bar = (current.pressure - prev.pressure) / dTheta; 
    const dP_Pa = dP_bar * 1e5;
    
    const P_Pa = current.pressure * 1e5;
    const V_m3 = current.volume;

    // HRR
    const termA = (gamma / (gamma - 1)) * P_Pa * dV;
    const termB = (1 / (gamma - 1)) * V_m3 * dP_Pa;
    const hrr = termA + termB;

    // CHR Logic Updated: Return null outside the window
    let currentChr: number | null = null;

    if (current.cad >= calcStart && current.cad <= calcEnd) {
        cumulativeHeat += hrr * dTheta;
        currentChr = cumulativeHeat;
    } else if (current.cad < calcStart) {
        cumulativeHeat = 0;
        currentChr = null; // Hide tail before start
    } else {
        // After calcEnd, stop plotting
        currentChr = null; // Hide tail after end
    }

    // Work (IMEP) -> Integral of P dV (Full Cycle)
    if (i > 0) {
      const pAvg = (current.pressure + points[i-1].pressure) / 2 * 1e5;
      const dV_step = current.volume - points[i-1].volume;
      workSum += pAvg * dV_step;
    }

    // Log Calculations (Volume in cc)
    const V_cc = V_m3 * 1e6;
    const logV = V_cc > 0 ? Math.log10(V_cc) : 0;
    const logP = P_Pa > 0 ? Math.log10(P_Pa) : 0;

    tempResults.push({
      cad: current.cad,
      pressure: current.pressure,
      volume: current.volume,
      hrr: hrr,
      chr: currentChr, // Now nullable
      ropr: dP_bar,
      gamma,
      logV: logV,
      logP: logP,
    });
  }

  // 4. Smoothing
  const rawHrr = tempResults.map(p => p.hrr);
  const rawRopr = tempResults.map(p => p.ropr);
  let smoothHrr = rawHrr;
  let smoothRopr = rawRopr;

  if (filterType === 'movingAverage') {
    smoothHrr = movingAverage(rawHrr, smoothingWindow);
    smoothRopr = movingAverage(rawRopr, smoothingWindow);
  } else if (filterType === 'savitzkyGolay') {
    smoothHrr = savitzkyGolay(rawHrr, sgWindowSize, sgPolynomialOrder);
    smoothRopr = savitzkyGolay(rawRopr, sgWindowSize, sgPolynomialOrder);
  }

  // 5. MFB & Final Assembly
  // Find Max CHR *only* within the window for normalization
  let maxChr = -Infinity;
  for (const p of tempResults) {
    if (p.chr !== null && p.chr > maxChr) {
        maxChr = p.chr;
    }
  }
  if (maxChr <= 0) maxChr = 1; 

  const finalPoints: CalculatedPoint[] = tempResults.map((p, i) => ({
    ...p,
    hrrFiltered: smoothHrr[i],
    roprFiltered: smoothRopr[i],
    mfb: p.chr !== null ? p.chr / maxChr : null // MFB is null if CHR is null
  }));

  // 6. Metrics Calculation
  let maxHrr = -Infinity;
  let maxHrrCad = 0;
  let maxRoPR = -Infinity;
  let maxRoPRCad = 0;

  for (const p of finalPoints) {
    if (p.hrrFiltered > maxHrr) {
      maxHrr = p.hrrFiltered;
      maxHrrCad = p.cad;
    }
    if (p.roprFiltered > maxRoPR) {
      maxRoPR = p.roprFiltered;
      maxRoPRCad = p.cad;
    }
  }

  const imep = (workSum / V_s_m3) / 1e5; // Pa -> Bar

  const getCadAtMfb = (target: number) => {
    for (let i = 0; i < finalPoints.length - 1; i++) {
      const p1 = finalPoints[i];
      const p2 = finalPoints[i+1];
      
      // Ensure both points have valid MFB data
      if (p1.mfb !== null && p2.mfb !== null) {
          if (p1.mfb <= target && p2.mfb >= target) {
            const frac = (target - p1.mfb) / (p2.mfb - p1.mfb);
            return p1.cad + frac * (p2.cad - p1.cad);
          }
      }
    }
    return null;
  };

  const ca05 = getCadAtMfb(0.05);
  const ca10 = getCadAtMfb(0.1);
  const ca50 = getCadAtMfb(0.5);
  const ca90 = getCadAtMfb(0.9);
  
  return {
    points: finalPoints,
    metrics: {
      peakPressure: fmt(maxP)!,
      peakPressureCad: fmt(maxPCad)!,
      peakHrr: fmt(maxHrr)!,
      peakHrrCad: fmt(maxHrrCad)!,
      peakRoPR: fmt(maxRoPR)!,
      peakRoPRCad: fmt(maxRoPRCad)!,
      imep: fmt(imep)!,
      ca05: fmt(ca05),
      ca10: fmt(ca10),
      ca50: fmt(ca50),
      ca90: fmt(ca90),
      combustionDuration: (ca10 && ca90) ? fmt(ca90 - ca10) : null
    }
  };
};
