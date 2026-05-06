import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Reporte } from '../../types';
import { NIVELES_GRAVEDAD, ESTADO_LABELS } from '../../types';
import 'leaflet/dist/leaflet.css';

function getFireIcon(nivel: number | null) {
  const info = nivel ? NIVELES_GRAVEDAD[nivel] : null;
  const color = info?.color || '#888';
  const emoji = info?.emoji || '❓';

  return L.divIcon({
    className: 'fire-marker',
    html: `<div style="
      background: ${color};
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      border: 2px solid rgba(255,255,255,0.9);
      box-shadow: 0 2px 12px ${color}88, 0 0 20px ${color}44;
      cursor: pointer;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  reportes: Reporte[];
}

export function FireMap({ reportes }: Props) {
  return (
    <MapContainer
      center={[-33.45, -70.65]}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      {reportes.map((r) => (
        <Marker key={r.id} position={[r.latitud, r.longitud]} icon={getFireIcon(r.nivelGravedad)}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', color: '#1a1a1a', minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                {r.nivelGravedad ? NIVELES_GRAVEDAD[r.nivelGravedad]?.emoji : '❓'}{' '}
                {r.nivelGravedad ? NIVELES_GRAVEDAD[r.nivelGravedad]?.nombre : 'Sin clasificar'}
              </div>
              {r.descripcion && <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>{r.descripcion}</div>}
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                📍 {r.comuna || r.direccion || `${r.latitud.toFixed(4)}, ${r.longitud.toFixed(4)}`}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                🕐 {formatDate(r.createdAt)}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                  background: `${ESTADO_LABELS[r.estado]?.color}22`,
                  color: ESTADO_LABELS[r.estado]?.color,
                }}>
                  {ESTADO_LABELS[r.estado]?.label || r.estado}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
