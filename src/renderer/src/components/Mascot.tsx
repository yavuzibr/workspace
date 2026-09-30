interface Props {
  size?: number
  className?: string
}

export function Mascot({ size = 24, className }: Props): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="workspace-mascot-bg"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#A855F7" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#workspace-mascot-bg)" />
      <g transform="translate(16 15)">
        <path
          d="M -7.8 0.2 A 7.8 7.8 0 0 1 7.8 0.2 L 7.8 7.4 Q 5.85 10 3.9 7.4 Q 1.95 10 0 7.4 Q -1.95 10 -3.9 7.4 Q -5.85 10 -7.8 7.4 Z"
          fill="white"
        />
        <circle cx="-2.7" cy="-1" r="1.35" fill="#4C1D95" />
        <circle cx="2.7" cy="-1" r="1.35" fill="#4C1D95" />
      </g>
    </svg>
  )
}
