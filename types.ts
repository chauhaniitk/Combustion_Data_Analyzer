export interface DataPoint {
  cad: number;
  pressure: number;
}

export type FilterType = 'unfiltered' | 'movingAverage' | 'savitzkyGolay';

export interface EngineParams {
  rc: number;
  conRodLength: number;
  sweptVolume: number;
  stroke: number;
}

export interface CalculatedPoint {
  cad: number;
  pressure: number;
  volume: number;
  hrr: number;
  chr: number | null;      // Changed to allow null
  ropr: number;
  gamma: number;
  logV: number;
  logP: number;
  hrrFiltered: number;
  roprFiltered: number;
  mfb: number | null;      // Changed to allow null
}

export interface SimulationMetrics {
  peakPressure: number | null;
  peakPressureCad: number | null;
  peakHrr: number | null;
  peakHrrCad: number | null;
  peakRoPR: number | null;
  peakRoPRCad: number | null;
  imep: number | null;
  ca05: number | null;
  ca10: number | null;
  ca50: number | null;
  ca90: number | null;
  combustionDuration: number | null;
}

export interface SimulationCase {
  id: string;
  shift: number;
  data: CalculatedPoint[];
  metrics: SimulationMetrics;
  color: string;
  visible: boolean;
}
