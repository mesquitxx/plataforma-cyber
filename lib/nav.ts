import { BookOpenText, FlaskConical, House, LayoutDashboard, Route, type LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Início", href: "/", icon: House },
  { title: "Trilhas", href: "/trilhas", icon: Route },
  { title: "Painel", href: "/painel", icon: LayoutDashboard },
  { title: "Laboratórios", href: "/laboratorios", icon: FlaskConical },
  { title: "Glossário", href: "/glossario", icon: BookOpenText },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
