import type { LucideProps } from "lucide-react"
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleUserRound,
  Copy,
  ExternalLink,
  Eye,
  Headphones,
  Layers3,
  Lock,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Terminal,
  UserRound,
  Wallet,
  X,
  Zap,
} from "lucide-react"

export type IconProps = LucideProps

export const BoltIcon = Zap
export const ShieldIcon = Shield
export const ShieldAlertIcon = ShieldAlert
export const ShieldCheckIcon = ShieldCheck
export const PlayIcon = Play
export const PauseIcon = Pause
export const ArrowDownLeftIcon = ArrowDownLeft
export const ArrowUpRightIcon = ArrowUpRight
export const CheckIcon = Check
export const XMarkIcon = X
export const ChevronDownIcon = ChevronDown
export const ChevronUpIcon = ChevronUp
export const CopyIcon = Copy
export const WalletIcon = Wallet
export const BotIcon = Bot
export const LayersIcon = Layers3
export const LockClosedIcon = Lock
export const ArrowPathIcon = RefreshCw
export const ExternalLinkIcon = ExternalLink
export const ChevronRightIcon = ChevronRight
export const TerminalIcon = Terminal
export const BellIcon = Bell
export const EyeIcon = Eye
export const ArrowRightIcon = ArrowRight
export const MoreHorizontalIcon = MoreHorizontal
export const SlidersIcon = SlidersHorizontal
export const HeadsetIcon = Settings2
export const UserIcon = UserRound
export const AvatarIcon = CircleUserRound
export const SunIcon = Sun
export const MoonIcon = Moon

export function MurkLogoIcon({
  className = "h-8 w-8",
  ...props
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#151817" />
      <path
        d="M8.5 22.5V9.5L16 16.25L23.5 9.5V22.5"
        stroke="#F8F9F6"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 16.25V22.5"
        stroke="#F8F9F6"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
      <circle cx="23.5" cy="22.5" r="2.25" fill="#1769E0" />
    </svg>
  )
}

export function UsdcIcon({
  className = "h-5 w-5",
  ...props
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
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

export function UsdtIcon({
  className = "h-5 w-5",
  ...props
}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
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
