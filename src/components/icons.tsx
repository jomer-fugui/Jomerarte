import {
  Award,
  Ban,
  BookOpen,
  Briefcase,
  CalendarDays,
  Camera,
  Car,
  CircleHelp,
  Coffee,
  Cpu,
  Download,
  Feather,
  FileText,
  Flame,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Heart,
  House,
  Image as ImageIcon,
  Laugh,
  Leaf,
  Lightbulb,
  Link2,
  ListOrdered,
  MapPin,
  Megaphone,
  Music,
  Newspaper,
  Package,
  Palette,
  Phone,
  Quote,
  Rocket,
  Shield,
  ShoppingCart,
  Skull,
  Sparkles,
  Star,
  Store,
  Swords,
  Tag,
  ThumbsUp,
  TriangleAlert,
  Users,
  Video,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/lib/sections";
import type { SocialKind } from "@/lib/social";

const MAP: Record<IconName, LucideIcon> = {
  file: FileText,
  sparkles: Sparkles,
  star: Star,
  heart: Heart,
  thumbsUp: ThumbsUp,
  award: Award,
  store: Store,
  cart: ShoppingCart,
  package: Package,
  tag: Tag,
  wrench: Wrench,
  zap: Zap,
  camera: Camera,
  globe: Globe,
  graduation: GraduationCap,
  briefcase: Briefcase,
  rocket: Rocket,
  shield: Shield,
  lightbulb: Lightbulb,
  hammer: Hammer,
  cpu: Cpu,
  users: Users,
  quote: Quote,
  question: CircleHelp,
  laugh: Laugh,
  feather: Feather,
  music: Music,
  book: BookOpen,
  newspaper: Newspaper,
  megaphone: Megaphone,
  image: ImageIcon,
  video: Video,
  palette: Palette,
  gamepad: Gamepad2,
  swords: Swords,
  flame: Flame,
  skull: Skull,
  alert: TriangleAlert,
  ban: Ban,
  link: Link2,
  list: ListOrdered,
  download: Download,
  gift: Gift,
  map: MapPin,
  phone: Phone,
  calendar: CalendarDays,
  car: Car,
  leaf: Leaf,
  coffee: Coffee,
  home: House,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const C = MAP[name] ?? Sparkles;
  return <C className={className} aria-hidden="true" />;
}

type BrandProps = { className?: string };

export function InstagramIcon({ className }: BrandProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: BrandProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function YoutubeIcon({ className }: BrandProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

export function TiktokIcon({ className }: BrandProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 2.6 2.4 4.4 5 4.6" />
    </svg>
  );
}

export function XIcon({ className }: BrandProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

/** Avión de papel de Telegram */
export function TelegramIcon({ className }: BrandProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 10l-4 4l6 6l4-16l-18 7l4 2l2 6l3-4" />
    </svg>
  );
}

export function SocialIcon({ kind, className }: { kind: SocialKind; className?: string }) {
  switch (kind) {
    case "instagram":
      return <InstagramIcon className={className} />;
    case "facebook":
      return <FacebookIcon className={className} />;
    case "youtube":
      return <YoutubeIcon className={className} />;
    case "tiktok":
      return <TiktokIcon className={className} />;
    case "telegram":
      return <TelegramIcon className={className} />;
    default:
      return <XIcon className={className} />;
  }
}
