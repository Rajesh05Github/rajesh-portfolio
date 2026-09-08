"use client";

import { useEffect, useState } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import type { PortfolioSection } from "@/lib/db/schema";
import {
  SECTION_LABELS,
  sectionAnchor,
} from "@/features/portfolio/section-labels";
import { useThemeMode } from "@/components/theme/theme-mode-provider";

function ThemeModeToggle() {
  const { mode, toggleMode } = useThemeMode();
  return (
    <button
      onClick={toggleMode}
      className="glass hover:text-primary flex h-9 w-9 items-center justify-center rounded-full text-sm"
      aria-label={
        mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function Navbar({
  profileName,
  brandLabel,
  sections,
}: {
  profileName: string;
  brandLabel?: string;
  sections: PortfolioSection[];
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = sections
    .filter((section) => section.key !== "HERO" && section.key !== "CONTACT")
    .map((section) => ({
      href: `#${sectionAnchor(section.key)}`,
      label: SECTION_LABELS[section.key],
    }));
  const hasContact = sections.some((section) => section.key === "CONTACT");
  // Admin-configurable via Profile → "Navbar brand" (src/components/admin/
  // profile-form.tsx); falls back to the profile name's first letter when
  // that field is left blank, so there's always something sensible to show.
  const mark =
    brandLabel?.trim() || profileName.trim().charAt(0).toUpperCase() || "•";

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
        isScrolled ? "glass-strong py-3" : "bg-transparent py-5"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6">
        <a
          href="#"
          className="hover:text-primary text-xl font-bold tracking-tight"
        >
          {mark}
          <span className="text-primary">.</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          <div className="glass flex items-center gap-1 rounded-full px-2 py-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground hover:bg-surface rounded-full px-4 py-2 text-sm"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeModeToggle />
          {hasContact && (
            <a href="#contact" className="btn-primary text-sm hover:opacity-90">
              Contact Me
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeModeToggle />
          <button
            className="text-foreground cursor-pointer p-2"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="glass-strong animate-fade-in md:hidden">
          <div className="container mx-auto flex flex-col gap-4 px-6 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-muted-foreground hover:text-foreground py-2 text-lg"
              >
                {link.label}
              </a>
            ))}
            {hasContact && (
              <a
                href="#contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-primary text-center"
              >
                Contact Me
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
