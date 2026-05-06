import type { Reporte } from '../../types';
import { X, AlertTriangle } from 'lucide-react';
import { NIVELES_GRAVEDAD } from '../../types';

interface Props {
  reporte: Reporte;
  onClose: () => void;
}

export function AlertBanner({ reporte, onClose }: Props) {
  const nivel = reporte.nivelGravedad ? NIVELES_GRAVEDAD[reporte.nivelGravedad] : null;

  return (
    <div className="alert-banner">
      <AlertTriangle size={24} />
      <div>
        <strong>🚨 Alerta Crítica — {nivel?.nombre || 'Incendio'}</strong>
        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 2 }}>
          {reporte.descripcion || reporte.comuna || 'Nuevo reporte de alta gravedad'}
        </div>
      </div>
      <button className="alert-banner__close" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}
