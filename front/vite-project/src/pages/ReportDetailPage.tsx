import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { SeverityBadge, EstadoBadge } from '../components/ui/Badges';
import { useAuth } from '../context/AuthContext';
import type { Reporte } from '../types';
import { NIVELES_GRAVEDAD } from '../types';
import { ArrowLeft, MapPin, Clock, User, Bot } from 'lucide-react';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.reportes.get(id)
        .then((data: any) => setReporte(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleEstado = async (estado: string) => {
    if (!id) return;
    try {
      const updated: any = await api.reportes.actualizarEstado(id, { estado });
      setReporte(updated);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;
  if (!reporte) return <div className="page"><div className="page__container"><h2>Reporte no encontrado</h2></div></div>;

  const nivel = reporte.nivelGravedad ? NIVELES_GRAVEDAD[reporte.nivelGravedad] : null;
  const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'BRIGADISTA';

  return (
    <div className="page">
      <div className="page__container" style={{ maxWidth: 700 }}>
        <Link to="/mis-reportes" className="btn btn--secondary btn--sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={16} /> Volver
        </Link>

        <div className="card" style={{ padding: 32 }}>
          {reporte.fotoUrl && (
            <img src={`http://localhost:8080${reporte.fotoUrl}`} alt="Foto del incendio"
              style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 24, maxHeight: 400, objectFit: 'cover' }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: '2.5rem' }}>{nivel?.emoji || '❓'}</span>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{nivel?.nombre || 'Sin clasificar'}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <SeverityBadge nivel={reporte.nivelGravedad} />
                <EstadoBadge estado={reporte.estado} />
              </div>
            </div>
          </div>

          {reporte.descripcion && (
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.7 }}>{reporte.descripcion}</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: 4 }}><MapPin size={12} /> Ubicación</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{reporte.comuna || reporte.direccion || 'No especificada'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{reporte.latitud.toFixed(4)}, {reporte.longitud.toFixed(4)}</div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: 4 }}><Clock size={12} /> Fecha</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {new Date(reporte.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                {new Date(reporte.createdAt).toLocaleTimeString('es-CL')}
              </div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: 4 }}><User size={12} /> Reportado por</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{reporte.reportadoPorNombre || 'Desconocido'}</div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: 4 }}><Bot size={12} /> Clasificación IA</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {reporte.confianzaIa ? `${reporte.confianzaIa.toFixed(1)}% confianza` : 'No clasificado'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{reporte.metodoClasificacion || '-'}</div>
            </div>
          </div>

          {/* Admin/Brigadista: cambiar estado */}
          {isAdmin && reporte.estado !== 'EXTINGUIDO' && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '100%', marginBottom: 4 }}>Cambiar estado:</span>
              {['EN_ATENCION', 'CONTROLADO', 'EXTINGUIDO'].filter(e => e !== reporte.estado).map(e => (
                <button key={e} className="btn btn--secondary btn--sm" onClick={() => handleEstado(e)}>
                  {e.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
