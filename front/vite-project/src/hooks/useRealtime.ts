import { useEffect, useState, useCallback } from 'react';
import { stompClient } from '../lib/stomp';
import type { Reporte } from '../types';

export function useRealtime() {
  const [nuevosReportes, setNuevosReportes] = useState<Reporte[]>([]);
  const [alertaCritica, setAlertaCritica] = useState<Reporte | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    stompClient.onConnect = () => {
      setConnected(true);
      stompClient.subscribe('/topic/reportes', (message) => {
        const reporte: Reporte = JSON.parse(message.body);
        setNuevosReportes(prev => [reporte, ...prev]);
      });

      stompClient.subscribe('/topic/alertas', (message) => {
        const reporte: Reporte = JSON.parse(message.body);
        setAlertaCritica(reporte);
        setTimeout(() => setAlertaCritica(null), 10000);
      });
    };

    stompClient.onDisconnect = () => setConnected(false);
    stompClient.activate();

    return () => { stompClient.deactivate(); };
  }, []);

  const clearAlert = useCallback(() => setAlertaCritica(null), []);

  return { nuevosReportes, alertaCritica, connected, clearAlert };
}
