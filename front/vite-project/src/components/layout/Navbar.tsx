import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Flame, LogOut, Map, Plus, LayoutDashboard, List } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar__brand">
        <Flame size={22} color="#f97316" />
        Valle del Sol <span>Fire</span>
      </NavLink>
      <div className="navbar__links">
        <NavLink to="/" end className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}>
          <Map size={16} /> Mapa
        </NavLink>

        {user ? (
          <>
            <NavLink to="/reportar" className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}>
              <Plus size={16} /> Reportar
            </NavLink>
            <NavLink to="/mis-reportes" className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}>
              <List size={16} /> Mis Reportes
            </NavLink>
            {user.rol === 'ADMIN' && (
              <NavLink to="/dashboard" className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}>
                <LayoutDashboard size={16} /> Dashboard
              </NavLink>
            )}
            <button onClick={handleLogout} className="btn btn--secondary btn--sm" style={{ marginLeft: 8 }}>
              <LogOut size={14} /> Salir
            </button>
          </>
        ) : (
          <NavLink to="/auth" className="btn btn--primary btn--sm">
            Iniciar Sesión
          </NavLink>
        )}
      </div>
    </nav>
  );
}
