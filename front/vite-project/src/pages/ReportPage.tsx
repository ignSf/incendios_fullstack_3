import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { api } from '../lib/api';
import { Camera, MapPin, Send, Loader } from 'lucide-react';

export function ReportPage() {
  const { coords, error: geoError } = useGeolocation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ descripcion: '', direccion: '', comuna: '' });
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill GPS
  if (coords && !lat && !lng) {
    setLat(coords.lat.toFixed(6));
    setLng(coords.lng.toFixed(6));
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) { setError('Se requieren coordenadas GPS'); return; }
    setError('');
    setLoading(true);

    try {
      const datos = JSON.stringify({
        latitud: parseFloat(lat),
        longitud: parseFloat(lng),
        descripcion: form.descripcion,
        direccion: form.direccion,
        comuna: form.comuna,
      });

      const formData = new FormData();
      formData.append('datos', new Blob([datos], { type: 'application/json' }), 'datos.json');
      if (foto) formData.append('foto', foto);

      await api.reportes.create(formData);
      navigate('/mis-reportes');
    } catch (err: any) {
      setError(err.message || 'Error al crear reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page__container">
        <div className="page__header">
          <h1 className="page__title">🔥 Reportar Incendio</h1>
          <p className="page__subtitle">
            Sube una foto y tu ubicación. La IA clasificará la gravedad automáticamente.
          </p>
        </div>

        {error && <div className="auth-card__error" style={{ marginBottom: 20 }}>{error}</div>}

        <form className="report-form" onSubmit={handleSubmit}>
          {/* Foto */}
          <div className="report-form__upload" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
            {preview ? (
              <img src={preview} alt="Preview" />
            ) : (
              <>
                <Camera size={40} style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 600 }}>Tomar foto o seleccionar imagen</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>La IA analizará la gravedad del incendio</div>
              </>
            )}
          </div>

          {/* Coordenadas */}
          <div className="report-form__coords">
            <div className="input-group">
              <label><MapPin size={12} /> Latitud</label>
              <input className="input" type="number" step="any" placeholder="-33.45"
                value={lat} onChange={e => setLat(e.target.value)} required />
            </div>
            <div className="input-group">
              <label><MapPin size={12} /> Longitud</label>
              <input className="input" type="number" step="any" placeholder="-70.65"
                value={lng} onChange={e => setLng(e.target.value)} required />
            </div>
          </div>
          {geoError && <div style={{ fontSize: '0.8rem', color: '#f97316' }}>⚠️ GPS: {geoError}</div>}

          <div className="input-group">
            <label>Dirección (opcional)</label>
            <input className="input" placeholder="Av. Libertador 1234"
              value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </div>

          <div className="input-group">
            <label>Comuna (opcional)</label>
            <input className="input" placeholder="Providencia"
              value={form.comuna} onChange={e => setForm({ ...form, comuna: e.target.value })} />
          </div>

          <div className="input-group">
            <label>Descripción</label>
            <textarea className="input" placeholder="Describe lo que ves: humo, llamas, extensión..."
              value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </div>

          <button className="btn btn--primary btn--lg btn--full" type="submit" disabled={loading}>
            {loading ? <><Loader size={18} className="spinner" /> Enviando...</> : <><Send size={18} /> Enviar Reporte</>}
          </button>
        </form>
      </div>
    </div>
  );
}
