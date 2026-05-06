import { NIVELES_GRAVEDAD, ESTADO_LABELS } from '../../types';

export function SeverityBadge({ nivel }: { nivel: number | null }) {
  if (!nivel) return <span className="severity-badge" style={{ background: 'rgba(100,100,130,0.2)', color: '#888' }}>Sin clasificar</span>;
  const info = NIVELES_GRAVEDAD[nivel];
  if (!info) return null;
  return (
    <span className="severity-badge" style={{ background: `${info.color}20`, color: info.color }}>
      {info.emoji} {info.nombre}
    </span>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  const info = ESTADO_LABELS[estado];
  if (!info) return <span>{estado}</span>;
  return (
    <span className="estado-badge" style={{ background: `${info.color}20`, color: info.color }}>
      {info.label}
    </span>
  );
}
