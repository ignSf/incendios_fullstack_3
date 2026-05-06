const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function fetchAPI<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(error.error || `Error ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: { email: string; password: string; nombre: string; telefono?: string }) =>
      fetchAPI('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => fetchAPI('/api/auth/me'),
  },
  reportes: {
    list: (estado?: string) =>
      fetchAPI(`/api/reportes${estado ? `?estado=${estado}` : ''}`),
    get: (id: string) => fetchAPI(`/api/reportes/${id}`),
    create: (formData: FormData) =>
      fetch(`${API_URL}/api/reportes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      }).then(r => r.json()),
    misReportes: () => fetchAPI('/api/reportes/mis-reportes'),
    actualizarEstado: (id: string, data: { estado: string; comentario?: string }) =>
      fetchAPI(`/api/reportes/${id}/estado`, { method: 'PATCH', body: JSON.stringify(data) }),
    zona: (bounds: { north: number; south: number; east: number; west: number }) =>
      fetchAPI(`/api/reportes/zona?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`),
  },
  dashboard: {
    stats: () => fetchAPI('/api/dashboard/stats'),
  },
};
