# 🎨 Plan de Implementación — Frontend

## React + TypeScript + Vite + Leaflet + STOMP.js (WebSocket)

---

## Stack Técnico

| Componente | Tecnología | Función |
|---|---|---|
| **Framework** | React 19 + TypeScript | Ya inicializado en `front/vite-project/` |
| **Build** | Vite 8 | Dev server rápido, HMR |
| **Estilos** | Vanilla CSS (design system) | Sin TailwindCSS |
| **Mapa** | Leaflet + react-leaflet | Open source, sin API key (reemplaza Mapbox) |
| **Realtime** | @stomp/stompjs + SockJS | Conexión WebSocket STOMP al backend Spring Boot |
| **Routing** | react-router-dom v7 | Navegación SPA |
| **HTTP** | fetch nativo | Llamadas a la API REST |
| **Estado** | React Context + useReducer | Auth global, reportes |
| **Iconos** | Lucide React | Iconos modernos SVG |
| **Fuente** | Inter (Google Fonts) | Tipografía premium |

---

## Dependencias a Instalar

```bash
cd front/vite-project
npm install react-router-dom @stomp/stompjs sockjs-client leaflet react-leaflet lucide-react
npm install -D @types/leaflet @types/sockjs-client
```

---

## Estructura del Proyecto

```
front/vite-project/src/
├── assets/
│   └── logo.svg
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx           # Barra de navegación principal
│   │   ├── Sidebar.tsx          # Sidebar del dashboard
│   │   └── Footer.tsx
│   ├── map/
│   │   ├── FireMap.tsx          # Mapa Leaflet con marcadores
│   │   ├── FireMarker.tsx       # Marcador individual por gravedad
│   │   └── MapControls.tsx      # Filtros del mapa (estado, gravedad)
│   ├── reports/
│   │   ├── ReportForm.tsx       # Formulario crear reporte
│   │   ├── ReportCard.tsx       # Card de un reporte
│   │   ├── ReportDetail.tsx     # Vista detallada
│   │   └── ReportList.tsx       # Lista de reportes
│   ├── dashboard/
│   │   ├── StatsCards.tsx       # Cards con KPIs
│   │   ├── GravedadChart.tsx    # Gráfico de gravedad
│   │   ├── TimelineChart.tsx    # Timeline de reportes
│   │   └── RecentAlerts.tsx     # Alertas recientes
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── ui/
│       ├── SeverityBadge.tsx    # Badge color por gravedad (1-5)
│       ├── AlertBanner.tsx      # Banner de alerta realtime
│       ├── LoadingSpinner.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── pages/
│   ├── HomePage.tsx             # Mapa principal + reportes activos
│   ├── AuthPage.tsx             # Login / Register
│   ├── ReportPage.tsx           # Formulario de reporte
│   ├── MyReportsPage.tsx        # Mis reportes
│   ├── ReportDetailPage.tsx     # Detalle de un reporte
│   └── DashboardPage.tsx        # Dashboard admin
├── context/
│   ├── AuthContext.tsx          # Estado global de autenticación
│   └── SocketContext.tsx        # Proveedor STOMP WebSocket
├── hooks/
│   ├── useAuth.ts              # Hook de autenticación
│   ├── useReports.ts           # CRUD de reportes
│   ├── useSocket.ts            # STOMP WebSocket events
│   ├── useGeolocation.ts       # Obtener GPS del navegador
│   └── useMap.ts               # Estado del mapa
├── lib/
│   ├── api.ts                  # Fetch wrapper con JWT
│   ├── stomp.ts                # Cliente STOMP + SockJS
│   └── constants.ts            # Colores, niveles, config
├── styles/
│   ├── index.css               # Design system + variables CSS
│   ├── map.css                 # Estilos del mapa
│   └── dashboard.css           # Estilos del dashboard
├── types/
│   └── index.ts                # Interfaces TypeScript
├── App.tsx                     # Router principal
├── main.tsx                    # Entry point
└── vite-env.d.ts
```

---

## Páginas y Rutas

| Ruta | Página | Auth | Descripción |
|---|---|---|---|
| `/` | HomePage | ❌ | Mapa con focos activos (público) |
| `/auth` | AuthPage | ❌ | Login / Register |
| `/reportar` | ReportPage | ✅ | Formulario de nuevo reporte |
| `/mis-reportes` | MyReportsPage | ✅ | Lista de mis reportes |
| `/reporte/:id` | ReportDetailPage | ✅ | Detalle de un reporte |
| `/dashboard` | DashboardPage | ✅ admin | Dashboard de estadísticas |

---

## Implementación Clave

### 1. Tipos TypeScript

```typescript
// src/types/index.ts
export interface Reporte {
  id: string;
  created_at: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  comuna?: string;
  descripcion?: string;
  foto_url?: string;
  nivel_gravedad: number | null;
  confianza_ia: number | null;
  estado: 'pendiente' | 'en_atencion' | 'controlado' | 'extinguido';
  reportado_por_nombre?: string;
  atendido_por_nombre?: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'ciudadano' | 'admin' | 'brigadista';
}

export const NIVELES_GRAVEDAD = {
  1: { nombre: 'Conato', emoji: '🟢', color: '#22c55e' },
  2: { nombre: 'Menor', emoji: '🟡', color: '#eab308' },
  3: { nombre: 'Moderado', emoji: '🟠', color: '#f97316' },
  4: { nombre: 'Mayor', emoji: '🔴', color: '#ef4444' },
  5: { nombre: 'Catastrófico', emoji: '⚫', color: '#1f2937' },
} as const;
```

### 2. API Client con JWT

```typescript
// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL;

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error en la API');
  }

  return res.json();
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: { email: string; password: string; nombre: string }) =>
      fetchAPI('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => fetchAPI('/api/auth/me'),
  },
  reportes: {
    list: (params?: string) => fetchAPI(`/api/reportes?${params || ''}`),
    get: (id: string) => fetchAPI(`/api/reportes/${id}`),
    create: (formData: FormData) =>
      fetch(`${API_URL}/api/reportes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData, // multipart (incluye foto)
      }).then(r => r.json()),
    zona: (bounds: { north: number; south: number; east: number; west: number }) =>
      fetchAPI(`/api/reportes/zona?n=${bounds.north}&s=${bounds.south}&e=${bounds.east}&w=${bounds.west}`),
  },
  dashboard: {
    stats: () => fetchAPI('/api/dashboard/stats'),
  },
};
```

### 3. STOMP Client (WebSocket)

```typescript
// src/lib/stomp.ts
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_URL = import.meta.env.VITE_API_URL;

export const stompClient = new Client({
  webSocketFactory: () => new SockJS(`${API_URL}/ws`),
  reconnectDelay: 5000,
  debug: (msg) => console.log('[STOMP]', msg),
});
```

### 4. Hook Realtime (STOMP)

```typescript
// src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { stompClient } from '../lib/stomp';
import type { Reporte } from '../types';

export function useRealtimeReportes() {
  const [nuevosReportes, setNuevosReportes] = useState<Reporte[]>([]);
  const [alertaCritica, setAlertaCritica] = useState<Reporte | null>(null);

  useEffect(() => {
    stompClient.onConnect = () => {
      // Suscribirse a nuevos reportes
      stompClient.subscribe('/topic/reportes', (message) => {
        const reporte: Reporte = JSON.parse(message.body);
        setNuevosReportes(prev => [reporte, ...prev]);
      });

      // Suscribirse a alertas críticas (gravedad >= 4)
      stompClient.subscribe('/topic/alertas', (message) => {
        const reporte: Reporte = JSON.parse(message.body);
        setAlertaCritica(reporte);
        setTimeout(() => setAlertaCritica(null), 10000);
      });
    };

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, []);

  return { nuevosReportes, alertaCritica };
}
```

### 5. Mapa con Leaflet

```typescript
// src/components/map/FireMap.tsx
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Reporte, NIVELES_GRAVEDAD } from '../../types';

// Marcador personalizado por nivel de gravedad
function getFireIcon(nivel: number) {
  const info = NIVELES_GRAVEDAD[nivel as keyof typeof NIVELES_GRAVEDAD];
  return L.divIcon({
    className: 'fire-marker',
    html: `<div style="background:${info.color};width:28px;height:28px;
           border-radius:50%;display:flex;align-items:center;
           justify-content:center;font-size:14px;border:2px solid white;
           box-shadow:0 2px 8px rgba(0,0,0,0.3)">
           ${info.emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function FireMap({ reportes }: { reportes: Reporte[] }) {
  return (
    <MapContainer
      center={[-33.45, -70.65]}  // Santiago, Chile
      zoom={12}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {reportes.map(r => (
        r.nivel_gravedad && (
          <Marker key={r.id} position={[r.latitud, r.longitud]}
            icon={getFireIcon(r.nivel_gravedad)}>
            <Popup>
              <strong>{NIVELES_GRAVEDAD[r.nivel_gravedad as 1|2|3|4|5].nombre}</strong>
              <br />{r.descripcion}
              <br />Estado: {r.estado}
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}
```

### 6. Formulario de Reporte con GPS

```typescript
// src/hooks/useGeolocation.ts
import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err.message),
      { enableHighAccuracy: true }
    );
  }, []);

  return { coords, error };
}
```

---

## Design System (CSS Variables)

```css
/* src/styles/index.css */
:root {
  /* Colores principales */
  --color-bg: #0a0a0f;
  --color-surface: #12121a;
  --color-surface-2: #1a1a26;
  --color-border: #2a2a3a;
  --color-text: #e8e8f0;
  --color-text-muted: #8888a0;

  /* Colores de gravedad */
  --severity-1: #22c55e;
  --severity-2: #eab308;
  --severity-3: #f97316;
  --severity-4: #ef4444;
  --severity-5: #1f2937;

  /* Accent */
  --color-primary: #f97316;
  --color-primary-hover: #ea580c;

  /* Tipografía */
  --font-sans: 'Inter', system-ui, sans-serif;

  /* Espaciado */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);

  /* Glassmorphism */
  --glass-bg: rgba(18, 18, 26, 0.8);
  --glass-border: rgba(255,255,255,0.06);
  --glass-blur: blur(16px);
}
```

---

## Variables de Entorno

```env
# front/vite-project/.env
VITE_API_URL=http://localhost:8080
```

---

## Checklist de Implementación

### Fase 1: Base (estructura + auth)
- [ ] Instalar dependencias (react-router, leaflet, @stomp/stompjs, sockjs-client)
- [ ] Crear design system en `index.css`
- [ ] Crear types/index.ts
- [ ] Crear lib/api.ts y lib/stomp.ts
- [ ] Crear AuthContext
- [ ] Crear páginas: AuthPage (login/register)
- [ ] Crear Navbar con navegación

### Fase 2: Mapa + Reportes
- [ ] Crear FireMap con Leaflet
- [ ] Crear FireMarker con colores por gravedad
- [ ] Crear HomePage con mapa
- [ ] Crear ReportForm con cámara + GPS
- [ ] Crear ReportCard y ReportList
- [ ] Crear MyReportsPage

### Fase 3: Realtime + Dashboard
- [ ] Integrar STOMP.js + SockJS client
- [ ] Crear hook useRealtimeReportes
- [ ] Crear AlertBanner para alertas críticas
- [ ] Crear DashboardPage con StatsCards
- [ ] Crear gráficos (timeline, gravedad)

### Fase 4: Polish
- [ ] Animaciones y transiciones CSS
- [ ] Responsive design (mobile-first)
- [ ] Loading states y error handling
- [ ] SEO (meta tags, title)
- [ ] PWA básico (manifest.json)
