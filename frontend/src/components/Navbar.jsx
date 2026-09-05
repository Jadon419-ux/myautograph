import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import iconMark from "../assets/icon-mark.png";
import ThemeToggle from "./ThemeToggle.jsx";
import WalletMenu from "./WalletMenu.jsx";

const NAV_LINKS = [
  { to: "/celebrities", label: "Celebrities" },
  { to: "/concerts", label: "Get tickets" },
  { to: "/verify", label: "Verify" },
  { to: "/shop", label: "Shop from Star" },
  { to: "/star-auctions", label: "Auctions" },
];

export default function Navbar() {
  const { user, logout, authenticatorInvites } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasPendingInvites = authenticatorInvites.some((a) => a.status === "pending");

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/");
  }

  return (
    <header className="border-b border-brand-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            className="relative -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-brand-charcoal hover:bg-brand-gray md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              {menuOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
            {hasPendingInvites && !menuOpen && (
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-green" />
            )}
          </button>
          <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <img src={iconMark} alt="My Autograph" className="h-9 w-9 rounded-lg object-cover sm:h-10 sm:w-10" />
            <span className="text-base font-semibold leading-none text-brand-charcoal sm:text-xl">
              <span className="font-normal">My</span> Autograph
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-brand-charcoal md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-brand-green">
              {link.label}
            </Link>
          ))}

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
              <WalletMenu />
              <button onClick={handleLogout} className="btn-secondary">
                Log out
              </button>
              <ThemeToggle />
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand-green">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary">
                Sign up
              </Link>
              <ThemeToggle />
            </>
          )}
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          {user ? (
            <WalletMenu />
          ) : (
            <Link to="/signup" className="btn-primary text-sm">
              Sign up
            </Link>
          )}
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-0.5 border-t border-brand-border bg-white px-4 py-3 text-sm font-medium text-brand-charcoal md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 hover:bg-brand-gray hover:text-brand-green"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                to="/community"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2.5 hover:bg-brand-gray hover:text-brand-green"
              >
                Community
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2.5 hover:bg-brand-gray hover:text-brand-green"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="mt-1 rounded-md px-2 py-2.5 text-left hover:bg-brand-gray"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 hover:bg-brand-gray hover:text-brand-green"
            >
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
