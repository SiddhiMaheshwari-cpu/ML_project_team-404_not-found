import React from "react";

// Small inline icon set (no extra dependency). All icons inherit currentColor.
function Svg({ size = 20, children, strokeWidth = 2, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const AlertIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3l10 18H2L12 3z" />
    <path d="M12 10v5M12 18h.01" />
  </Svg>
);

export const SearchIcon = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.5-4.5" />
  </Svg>
);

export const CodeIcon = (p) => (
  <Svg {...p}>
    <path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" />
  </Svg>
);

export const BracketsIcon = (p) => (
  <Svg {...p}>
    <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" />
  </Svg>
);

export const CheckIcon = ({ strokeWidth = 3.5, ...p }) => (
  <Svg strokeWidth={strokeWidth} {...p}>
    <path d="M5 12l5 5 9-10" />
  </Svg>
);

export const CopyIcon = (p) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
);

export const WrenchIcon = (p) => (
  <Svg {...p}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" />
  </Svg>
);

export const BrainIcon = (p) => (
  <Svg {...p}>
    <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0z" />
    <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" />
  </Svg>
);

export const ActivityIcon = (p) => (
  <Svg {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </Svg>
);

export const ShieldIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);

export const CpuIcon = (p) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9.5" y="9.5" width="5" height="5" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </Svg>
);

export const XIcon = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const StageIcon = ({ name, ...p }) => {
  if (name === "alert") return <AlertIcon {...p} />;
  if (name === "search") return <SearchIcon {...p} />;
  return <CodeIcon {...p} />;
};
