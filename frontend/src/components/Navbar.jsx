import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import iconMark from "../assets/icon-mark.png";

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
        <Link to="/" className="flex items-center gap-2.5">
          <img src={iconMark} alt="My Autograph" className="h-10 w-10 rounded-lg object-cover sm:h-11 sm:w-11" />
          <span className="text-lg font-semibold leading-none text-brand-charcoal sm:text-xl">
            <span className="font-normal">My</span> Autograph
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-brand-charcoal">
          <Link to="/celebrities" className="hover:text-brand-green">
            Celebrities
          </Link>
          <Link to="/concerts" className="hover:text-brand-green">
            Concerts
          </Link>
          <Link to="/verify" className="hover:text-brand-green">
            Verify
          </Link>
          <Link to="/marketplace" className="hover:text-brand-green">
            Marketplace
          </Link>
          <Link to="/merch" className="hover:text-brand-green">
            Merch
          </Link>

          {user ? (
            <>
              <Link to="/community" className="hover:text-brand-green">
                Community
              </Link>
              <Link to="/dashboard" className="flex items-center gap-2 hover:text-brand-green">
                <span className="h-7 w-7 overflow-hidden rounded-full bg-brand-gray">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
                      {user.full_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </span>
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
