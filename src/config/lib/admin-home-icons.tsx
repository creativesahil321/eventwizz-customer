import {
  Clock,
  Globe,
  Monitor,
  UtensilsCrossed,
  TrendingUp,
  Ticket,
  Cog,
  Palette,
  ClipboardList,
  ShieldCheck,
  Calendar,
  CreditCard,
  Users,
  Star,
  Zap,
  Mail,
  BarChart3,
  Settings,
  Gift,
  MapPin,
  Bell,
  Heart,
  CheckCircle,
  Sparkles,
  Wallet,
  Building2,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated, white-label-safe icon set for the admin home "features" section.
 * Icons are stored by their generic name string so the choice is portable
 * across rebranded platform instances.
 */
export const ADMIN_HOME_ICONS: Record<string, LucideIcon> = {
  Clock,
  Globe,
  Monitor,
  UtensilsCrossed,
  TrendingUp,
  Ticket,
  Cog,
  Palette,
  ClipboardList,
  ShieldCheck,
  Calendar,
  CreditCard,
  Users,
  Star,
  Zap,
  Mail,
  BarChart3,
  Settings,
  Gift,
  MapPin,
  Bell,
  Heart,
  CheckCircle,
  Sparkles,
  Wallet,
  Building2,
};

export const ADMIN_HOME_ICON_OPTIONS = Object.keys(ADMIN_HOME_ICONS);

export const DEFAULT_ADMIN_HOME_ICON = "Sparkles";

/** Resolves a stored icon name to a component, falling back to a safe default. */
export function getAdminHomeIcon(name?: string | null): LucideIcon {
  if (name && ADMIN_HOME_ICONS[name]) return ADMIN_HOME_ICONS[name];
  return ADMIN_HOME_ICONS[DEFAULT_ADMIN_HOME_ICON];
}
