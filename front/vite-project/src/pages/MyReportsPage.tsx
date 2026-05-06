import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { SeverityBadge, EstadoBadge } from '../components/ui/Badges';
import type { Reporte } from '../types';
import { NIVELES_GRAVEDAD } from '../types';
import { FileText, Plus } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function MyReportsPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reportes.misReportes()
      .then((data: any) => setReportes(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="page__container">
        <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page__title">📋 Mis Reportes</h1>
            <p className="page__subtitle">{reportes.length} reporte{reportes.length !== 1 ? 's' : ''} enviado{reportes.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/reportar" className="btn btn--primary"><Plus size={16} /> Nuevo Reporte</Link>
        </div>

        {reportes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <FileText size={48} color="#555" style={{ marginBottom: 16 }} />
            <h3 style={{ marginBottom: 8 }}>No tienes reportes aún</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>Crea tu primer reporte de incendio</p>
            <Link to="/reportar" className="btn btn--primary"><Plus size={16} /> Reportar Incendio</Link>
          </div>
        ) : (
          <div className="report-list">
            {reportes.map(r => (
              <Link to={`/reporte/${r.id}`} key={r.id} className="report-card">
                <div className="report-card__severity">
                  {r.nivelGravedad ? NIVELES_GRAVEDAD[r.nivelGravedad]?.emoji : '❓'}
                </div>
                <div className="report-card__content">
                  <div className="report-card__header">
                    <span className="report-card__title">
                      {r.nivelGravedad ? NIVELES_GRAVEDAD[r.nivelGravedad]?.nombre : 'Sin clasificar'}
                    </span>
                    <span className="report-card__time">{formatDate(r.createdAt)}</span>
                  </div>
                  <div className="report-card__desc">{r.descripcion || r.direccion || 'Sin descripción'}</div>
                  <div className="report-card__footer">
                    <SeverityBadge nivel={r.nivelGravedad} />
                    <EstadoBadge estado={r.estado} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
