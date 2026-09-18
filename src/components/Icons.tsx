import React from "react"

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

export function BoltIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

export function ShieldIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export function ShieldAlertIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export function ShieldCheckIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export function PlayIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

export function PauseIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

export function ArrowDownLeftIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="17" y1="7" x2="7" y2="17" />
      <polyline points="17 17 7 17 7 7" />
    </svg>
  )
}

export function ArrowUpRightIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

export function CheckIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function XMarkIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function ChevronDownIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function ChevronUpIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

export function CopyIcon({ className = "w-3.5 h-3.5", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function WalletIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <circle cx="18" cy="14" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function BotIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth={3} />
      <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth={3} />
    </svg>
  )
}

export function LayersIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

export function LockClosedIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function ArrowPathIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
    </svg>
  )
}

export function ExternalLinkIcon({ className = "w-3.5 h-3.5", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function ChevronRightIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function TerminalIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

export function MurkLogoIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#111111" />
      <path
        d="M8 23V9L16 16.5L24 9V23M16 16.5V23"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16.5" r="1.5" fill="#2F9CF4" />
    </svg>
  )
}

export function UsdcIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="12" cy="12" r="10" fill="#2775CA" />
      <path
        d="M12.75 6.5V8.05C14.4 8.35 15.4 9.4 15.4 10.85H13.65C13.65 10.05 13.05 9.45 12 9.45C10.95 9.45 10.35 9.95 10.35 10.7C10.35 11.4 10.9 11.75 12.3 12.15C14.15 12.65 15.5 13.35 15.5 15.05C15.5 16.5 14.35 17.55 12.75 17.85V19.5H11.25V17.85C9.5 17.55 8.5 16.4 8.5 14.9H10.25C10.25 15.85 10.95 16.45 12 16.45C13.1 16.45 13.75 15.9 13.75 15.1C13.75 14.3 13.15 13.9 11.7 13.5C9.9 12.95 8.6 12.3 8.6 10.65C8.6 9.25 9.7 8.3 11.25 8.05V6.5H12.75Z"
        fill="white"
      />
    </svg>
  )
}

export function UsdtIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="12" cy="12" r="10" fill="#26A17B" />
      <path
        d="M14.5 9H9.5V7.5H14.5V9ZM13.5 13.25C13.35 13.3 12.8 13.45 12 13.45C11.2 13.45 10.65 13.3 10.5 13.25V17H8.5V12.75C9.4 13.05 10.6 13.2 12 13.2C13.4 13.2 14.6 13.05 15.5 12.75V17H13.5V13.25ZM16.5 11.5C16.5 12.5 14.5 13.35 12 13.35C9.5 13.35 7.5 12.5 7.5 11.5C7.5 10.5 9.5 9.65 12 9.65C14.5 9.65 16.5 10.5 16.5 11.5Z"
        fill="white"
      />
    </svg>
  )
}

export function BellIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function EyeIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function ArrowRightIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function MoreHorizontalIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

export function SlidersIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

export function HeadsetIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

export function UserIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function AvatarIcon({ className = "w-10 h-10", ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="20" cy="20" r="20" fill="#EAE8E3" />
      <circle cx="20" cy="20" r="19" fill="url(#avatar-grad)" />
      <path
        d="M8.5 37.5C9.5 30.5 14.5 27 20 27C25.5 27 30.5 30.5 31.5 37.5"
        fill="#829578"
      />
      <path
        d="M17 23.5V26.5C17 28.2 18.3 29.5 20 29.5C21.7 29.5 23 28.2 23 26.5V23.5"
        fill="#F4C7A8"
      />
      <circle cx="20" cy="18.5" r="7.5" fill="#FED8B9" />
      <path
        d="M13.5 16.5C13 13 15.5 10 20 10C24.5 10 27 13 26.5 16.5C26 13.5 24 11.5 20 11.5C16 11.5 14 13.5 13.5 16.5Z"
        fill="#8C5835"
      />
      <path
        d="M15 12C16.5 9.5 20 9 22 9.5C24.5 10 26 12 26 12C26.5 10.5 25.5 8.5 23 8C20 7.5 16.5 9 15 12Z"
        fill="#754728"
      />
      <circle cx="17.8" cy="18" r="1" fill="#3D291D" />
      <circle cx="22.2" cy="18" r="1" fill="#3D291D" />
      <path
        d="M19 21C19.5 21.6 20.5 21.6 21 21"
        stroke="#D99B77"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <defs>
        <radialGradient
          id="avatar-grad"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(20 12) rotate(90) scale(28)"
        >
          <stop stopColor="#F9F8F5" />
          <stop offset="1" stopColor="#E5E3DC" />
        </radialGradient>
      </defs>
    </svg>
  )
}



