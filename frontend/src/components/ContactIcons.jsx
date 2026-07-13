function Badge({ children }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-green text-white">
      {children}
    </span>
  );
}

export function MailIcon() {
  return (
    <Badge>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    </Badge>
  );
}

export function GlobeIcon() {
  return (
    <Badge>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9Z" />
      </svg>
    </Badge>
  );
}

export function PhoneIcon() {
  return (
    <Badge>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.3 21 3 13.7 3 4.9c0-.6.4-1 1-1h3.3c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z" />
      </svg>
    </Badge>
  );
}

export function BuildingIcon() {
  return (
    <Badge>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
      </svg>
    </Badge>
  );
}
