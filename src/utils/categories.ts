import {
  Tag,
  Utensils,
  Car,
  Home,
  HeartPulse,
  Briefcase,
  Wallet,
  Plane,
  ReceiptText,
  PiggyBank,
  CircleDollarSign,
  ShoppingCart,
  GraduationCap,
  Gamepad2,
  Dumbbell,
  Shield,
  Building2,
  Smartphone,
  Tv,
  Stethoscope,
  Bus,
  Fuel,
  Gift,
  PawPrint,
  Wrench,
  BadgeDollarSign,
  LucideIcon,
} from "lucide-react";

export type CategoryScope = "transaction" | "budget" | "bill" | "saving";

export type AppCategory = {
  id: number;
  name: string;
  icon: string;
  applies_to: CategoryScope;
};

export const CATEGORY_ICON_OPTIONS = [
  "Tag",
  "Utensils",
  "Car",
  "Home",
  "HeartPulse",
  "Briefcase",
  "Wallet",
  "Plane",
  "ReceiptText",
  "PiggyBank",
  "CircleDollarSign",
  "ShoppingCart",
  "GraduationCap",
  "Gamepad2",
  "Dumbbell",
  "Shield",
  "Building2",
  "Smartphone",
  "Tv",
  "Stethoscope",
  "Bus",
  "Fuel",
  "Gift",
  "PawPrint",
  "Wrench",
  "BadgeDollarSign",
] as const;

const iconMap: Record<string, LucideIcon> = {
  Tag,
  Utensils,
  Car,
  Home,
  HeartPulse,
  Briefcase,
  Wallet,
  Plane,
  ReceiptText,
  PiggyBank,
  CircleDollarSign,
  ShoppingCart,
  GraduationCap,
  Gamepad2,
  Dumbbell,
  Shield,
  Building2,
  Smartphone,
  Tv,
  Stethoscope,
  Bus,
  Fuel,
  Gift,
  PawPrint,
  Wrench,
  BadgeDollarSign,
};

export const resolveCategoryIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] ?? Tag;
};

export const canManageCategories = (role: string | null, tier: string | null) => {
  if (role === "admin") return true;
  return tier === "premium";
};
