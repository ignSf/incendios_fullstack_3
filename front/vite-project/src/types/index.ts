export interface Reporte {
  id: string;
  createdAt: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  comuna?: string;
  descripcion?: string;
  fotoUrl?: string;
  nivelGravedad: number | null;
  confianzaIa: number | null;
  metodoClasificacion?: string;
  estado: 'PENDIENTE' | 'EN_ATENCION' | 'CONTROLADO' | 'EXTINGUIDO';
  reportadoPorNombre?: string;
  atendidoPorNombre?: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'CIUDADANO' | 'ADMIN' | 'BRIGADISTA';
  token?: string;
}

export interface NivelInfo {
  nombre: string;
  emoji: string;
  color: string;
  descripcion: string;
}

export const NIVELES_GRAVEDAD: Record<number, NivelInfo> = {
  1: { nombre: 'Conato', emoji: '🟢', color: '#22c55e', descripcion: 'Fuego muy pequeño' },
  2: { nombre: 'Menor', emoji: '🟡', color: '#eab308', descripcion: 'Fuego localizado' },
  3: { nombre: 'Moderado', emoji: '🟠', color: '#f97316', descripcion: 'Fuego considerable' },
  4: { nombre: 'Mayor', emoji: '🔴', color: '#ef4444', descripcion: 'Fuego grande' },
  5: { nombre: 'Catastrófico', emoji: '⚫', color: '#991b1b', descripcion: 'Fuego masivo' },
};

export const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: '#f97316' },
  EN_ATENCION: { label: 'En Atención', color: '#3b82f6' },
  CONTROLADO: { label: 'Controlado', color: '#22c55e' },
  EXTINGUIDO: { label: 'Extinguido', color: '#6b7280' },
};
