import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import logo from "../assets/logo-navbar.png";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="border-b border-brand-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="My Autograph" className="h-12 w-auto sm:h-14" />
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-brand-charcoal">
          <Link to="/celebrities" className="hover:text-brand-green">
            Celebrities
          </Link>
          <Link to="/concerts" className="hover:text-brand-green">
            Concerts
          </Link>

          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-brand-green">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-secondary">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand-green">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
