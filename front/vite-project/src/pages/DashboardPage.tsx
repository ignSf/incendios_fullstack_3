import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Flame, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface DayStat {
  fecha: string;
  total: number;
  gravedadPromedio: number;
  pendientes: number;
  enAtencion: number;
  extinguidos: number;
  criticos: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.stats()
      .then((data: any) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;

  const totals = stats.reduce((acc, s) => ({
    total: acc.total + (s.total || 0),
    pendientes: acc.pendientes + (s.pendientes || 0),
    enAtencion: acc.enAtencion + (s.enAtencion || 0),
    extinguidos: acc.extinguidos + (s.extinguidos || 0),
    criticos: acc.criticos + (s.criticos || 0),
  }), { total: 0, pendientes: 0, enAtencion: 0, extinguidos: 0, criticos: 0 });

  return (
    <div className="page">
      <div className="page__container">
        <div className="page__header">
          <h1 className="page__title">📊 Dashboard</h1>
          <p className="page__subtitle">Estadísticas de los últimos 30 días</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__value" style={{ color: 'var(--color-primary)' }}>
              <Flame size={24} style={{ marginRight: 8 }} />{totals.total}
            </div>
            <div className="stat-card__label">Total Reportes</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value" style={{ color: '#f97316' }}>
              <Clock size={24} style={{ marginRight: 8 }} />{totals.pendientes}
            </div>
            <div className="stat-card__label">Pendientes</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value" style={{ color: '#3b82f6' }}>
              <AlertTriangle size={24} style={{ marginRight: 8 }} />{totals.enAtencion}
            </div>
            <div className="stat-card__label">En Atención</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value" style={{ color: '#22c55e' }}>
              <CheckCircle size={24} style={{ marginRight: 8 }} />{totals.extinguidos}
            </div>
            <div className="stat-card__label">Extinguidos</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value" style={{ color: '#ef4444' }}>{totals.criticos}</div>
            <div className="stat-card__label">Críticos (≥4)</div>
          </div>
        </div>

        {/* Tabla diaria */}
        <div className="card" style={{ overflow: 'auto' }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Desglose Diario</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Fecha', 'Total', 'Gravedad Prom.', 'Pendientes', 'En Atención', 'Extinguidos', 'Críticos'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.fecha}</td>
                  <td style={{ padding: '10px 12px' }}>{s.total}</td>
                  <td style={{ padding: '10px 12px', color: s.gravedadPromedio >= 3 ? '#ef4444' : '#22c55e' }}>
                    {Number(s.gravedadPromedio).toFixed(1)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{s.pendientes}</td>
                  <td style={{ padding: '10px 12px' }}>{s.enAtencion}</td>
                  <td style={{ padding: '10px 12px' }}>{s.extinguidos}</td>
                  <td style={{ padding: '10px 12px', color: s.criticos > 0 ? '#ef4444' : 'inherit', fontWeight: s.criticos > 0 ? 700 : 400 }}>
                    {s.criticos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
