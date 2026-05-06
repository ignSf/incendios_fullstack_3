import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, nombre);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #f97316, #dc5a0e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(249,115,22,0.3)',
          }}>
            <Flame size={28} color="white" />
          </div>
        </div>

        <h1 className="auth-card__title">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h1>
        <p className="auth-card__subtitle">
          Sistema de Gestión de Incendios — Valle del Sol
        </p>

        {error && <div className="auth-card__error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label>Nombre completo</label>
              <input className="input" type="text" placeholder="Juan Pérez"
                value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
          )}
          <div className="input-group">
            <label>Email</label>
            <input className="input" type="email" placeholder="tu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Contraseña</label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <div className="auth-card__toggle">
          {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </a>
        </div>
      </div>
    </div>
  );
}
