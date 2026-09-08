"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderKanban,
  Award,
  Trophy,
  Share2,
  FileDown,
  Mail,
  ListOrdered,
  Palette,
  SlidersHorizontal,
  BookOpen,
  Search,
  MessageSquare,
  History,
  Gauge,
  ClipboardCheck,
  ShieldAlert,
  Activity,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

type NavLink = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; links: NavLink[] };

/**
 * Icons exist for quick visual scanning, not decoration — the user's own
 * feedback was that a long list of same-weight text labels ("Profile",
 * "About", "Experience"...) is hard to distinguish at a glance. Group
 * titles get their own bolder, colored treatment (see below) for the same
 * reason: at rest, they previously used the exact same `text-muted-
 * foreground` color as the links under them.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    title: "",
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    links: [
      { href: "/admin/profile", label: "Profile", icon: User },
      { href: "/admin/about", label: "About", icon: FileText },
      { href: "/admin/experience", label: "Experience", icon: Briefcase },
      { href: "/admin/education", label: "Education", icon: GraduationCap },
      { href: "/admin/skills", label: "Skills", icon: Wrench },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/certifications", label: "Certifications", icon: Award },
      { href: "/admin/achievements", label: "Achievements", icon: Trophy },
      { href: "/admin/social-links", label: "Social links", icon: Share2 },
      { href: "/admin/resume", label: "Resume", icon: FileDown },
      { href: "/admin/contact", label: "Messages", icon: Mail },
    ],
  },
  {
    title: "Layout",
    links: [
      { href: "/admin/layout/sections", label: "Sections", icon: ListOrdered },
    ],
  },
  {
    title: "Appearance",
    links: [
      { href: "/admin/appearance/themes", label: "Themes", icon: Palette },
      {
        href: "/admin/appearance/customize",
        label: "Customize",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    title: "AI",
    links: [
      { href: "/admin/ai/knowledge", label: "Knowledge", icon: BookOpen },
      { href: "/admin/ai/rag-test", label: "RAG Test", icon: Search },
      { href: "/admin/ai/chat-test", label: "Chat Test", icon: MessageSquare },
      {
        href: "/admin/ai/conversations",
        label: "Conversations",
        icon: History,
      },
      { href: "/admin/ai/usage", label: "Usage & Cost", icon: Gauge },
      {
        href: "/admin/ai/evaluation",
        label: "Evaluation",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "Security",
    links: [
      { href: "/admin/security", label: "Abuse Events", icon: ShieldAlert },
    ],
  },
  {
    title: "Observability",
    links: [
      { href: "/admin/observability", label: "Request Trace", icon: Activity },
    ],
  },
  {
    title: "Account",
    links: [{ href: "/admin/account", label: "Account", icon: KeyRound }],
  },
];

export function SidebarNav({
  newContactCount = 0,
}: {
  newContactCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="border-border w-56 shrink-0 overflow-y-auto border-r p-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title || "root"} className="mb-6">
          {group.title && (
            <div className="text-primary/80 mb-2 px-3 text-xs font-bold tracking-wider uppercase">
              {group.title}
            </div>
          )}
          <div className="space-y-1">
            {group.links.map((link) => {
              // Exact match for "/admin" (it would otherwise also match every
              // other admin route as a prefix); startsWith for everything
              // else, so an edit/new sub-route still highlights its parent link.
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "bg-primary/15 text-primary flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold"
                      : "hover:bg-surface hover:text-foreground text-muted-foreground flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{link.label}</span>
                  {link.href === "/admin/contact" && newContactCount > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                      {newContactCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
