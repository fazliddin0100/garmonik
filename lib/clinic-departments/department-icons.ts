import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CookingPot,
  HeartPulse,
  IdCard,
  Laptop,
  Microscope,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';

/** Bo‘lim `roleKey` bo‘yicha ikonka */
export function departmentIconForRole(roleKey: string): LucideIcon {
  const key = roleKey.trim().toLowerCase();
  switch (key) {
    case 'shifokor':
    case 'chief_doctor':
    case 'director':
      return Stethoscope;
    case 'laboratory':
    case 'lab_manager':
    case 'lab_results':
      return Microscope;
    case 'nurse':
    case 'head_nurse':
      return HeartPulse;
    case 'kabinet':
    case 'reception':
      return IdCard;
    case 'farmatsevt':
      return Pill;
    case 'oshpaz':
      return UtensilsCrossed;
    case 'facilities':
      return CookingPot;
    case 'finance':
      return BadgeDollarSign;
    case 'kassir':
      return Wallet;
    case 'hr':
      return UserCog;
    case 'marketing':
      return BriefcaseBusiness;
    case 'it':
      return Laptop;
    case 'supply':
      return Users;
    case 'lawyer':
      return BriefcaseBusiness;
    case 'security':
      return ShieldCheck;
    default:
      return Building2;
  }
}

export function departmentAccentForRole(roleKey: string): {
  gradient: string;
  ring: string;
  soft: string;
} {
  const key = roleKey.trim().toLowerCase();
  if (['shifokor', 'chief_doctor', 'director'].includes(key)) {
    return {
      gradient: 'from-violet-600 to-indigo-600',
      ring: 'ring-violet-300',
      soft: 'border-violet-200 bg-violet-50/80 hover:border-violet-300 hover:bg-violet-50',
    };
  }
  if (['laboratory', 'lab_manager', 'lab_results'].includes(key)) {
    return {
      gradient: 'from-sky-500 to-cyan-600',
      ring: 'ring-sky-300',
      soft: 'border-sky-200 bg-sky-50/80 hover:border-sky-300 hover:bg-sky-50',
    };
  }
  if (['nurse', 'head_nurse'].includes(key)) {
    return {
      gradient: 'from-rose-500 to-pink-600',
      ring: 'ring-rose-300',
      soft: 'border-rose-200 bg-rose-50/80 hover:border-rose-300 hover:bg-rose-50',
    };
  }
  if (['farmatsevt'].includes(key)) {
    return {
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-300',
      soft: 'border-emerald-200 bg-emerald-50/80 hover:border-emerald-300 hover:bg-emerald-50',
    };
  }
  if (['oshpaz', 'facilities'].includes(key)) {
    return {
      gradient: 'from-orange-500 to-amber-600',
      ring: 'ring-orange-300',
      soft: 'border-orange-200 bg-orange-50/80 hover:border-orange-300 hover:bg-orange-50',
    };
  }
  return {
    gradient: 'from-slate-600 to-slate-800',
    ring: 'ring-slate-300',
    soft: 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white',
  };
}
