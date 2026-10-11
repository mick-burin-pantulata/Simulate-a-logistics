import type { ReactNode } from 'react';

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const Icons = {
  overview: (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  ),
  truck: (
    <Icon>
      <path d="M2 6h11v10H2z" />
      <path d="M13 9h4l4 4v3h-8" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </Icon>
  ),
  dock: (
    <Icon>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M7 21v-8h10v8" />
      <path d="M7 16h10" />
    </Icon>
  ),
  agv: (
    <Icon>
      <path d="M4 17V9h7l2 3v5" />
      <path d="M17 4v13h4" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="13" cy="18" r="1.8" />
    </Icon>
  ),
  boxes: (
    <Icon>
      <path d="M3 13h8v8H3zM13 13h8v8h-8zM8 3h8v8H8z" />
    </Icon>
  ),
  people: (
    <Icon>
      <circle cx="9" cy="7" r="3.2" />
      <path d="M3 21v-1.5A5.5 5.5 0 0 1 8.5 14h1a5.5 5.5 0 0 1 5.5 5.5V21" />
      <path d="M16 3.5a3.2 3.2 0 0 1 0 6.4M21 21v-1.5a5.5 5.5 0 0 0-3.5-5.1" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  ),
  play: (
    <Icon>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </Icon>
  ),
  pause: (
    <Icon>
      <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" />
    </Icon>
  ),
  reset: (
    <Icon>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </Icon>
  ),
  focus: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    </Icon>
  ),
  close: (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  ),
  log: (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </Icon>
  ),
  chevron: (
    <Icon size={16}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  ),
};
