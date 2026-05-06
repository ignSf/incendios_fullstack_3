import { useEffect, useState } from 'react';
import { FireMap } from '../components/map/FireMap';
import { AlertBanner } from '../components/ui/AlertBanner';
import { useRealtime } from '../hooks/useRealtime';
import { api } from '../lib/api';
import type { Reporte } from '../types';

export function HomePage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const { nuevosReportes, alertaCritica, connected, clearAlert } = useRealtime();

  useEffect(() => {
    api.reportes.list()
      .then((data: any) => setReportes(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Merge realtime reports
  const allReportes = [...nuevosReportes.filter(nr => !reportes.find(r => r.id === nr.id)), ...reportes];

  return (
    <div className="page">
      {alertaCritica && <AlertBanner reporte={alertaCritica} onClose={clearAlert} />}

      <div className="map-container">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <FireMap reportes={allReportes} />
        )}
      </div>

      {/* Connection indicator */}
      <div style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
        padding: '6px 14px', borderRadius: 999,
        background: connected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${connected ? '#22c55e44' : '#ef444444'}`,
        color: connected ? '#22c55e' : '#ef4444',
        fontSize: '0.75rem', fontWeight: 600,
        backdropFilter: 'blur(8px)',
      }}>
        {connected ? '🟢 Tiempo Real' : '🔴 Desconectado'}
      </div>
    </div>
  );
}
