export type TabId = 'fields' | 'resultant' | 'charges' | 'motor' | 'wires' | 'selector';
export type Vec = { x: number; y: number; z: number };
export type Source = 'bar' | 'wire' | 'coil' | 'solenoid' | 'earth';
export type Particle = 'proton' | 'electron' | 'positive' | 'negative';
export interface Params {
  source: Source; current: number; current2: number; turns: number;
  radius: number; length: number; separation: number; angle: number; orientation: number;
  field: number; speed: number; mass: number; charge: number; electric: number;
  particle: Particle; analyser: boolean; end: boolean; fieldSign: number;
  probe: Vec; wire1: Vec; wire2: Vec; compass: Vec;
}
export interface ViewOptions { dimension: '2D' | '3D'; fields: boolean; vectors: boolean; labels: boolean; trail: boolean; slow: boolean }
export interface Reading { label: string; value: number; unit: string; color?: string }
export interface PlotData { points: { x: number; y: number }[]; xLabel: string; yLabel: string; xUnit: string; yUnit: string; operating: { x: number; y: number }; caption: string }
export interface Challenge { title: string; hint: string; solution: string; check: (p: Params) => boolean }
