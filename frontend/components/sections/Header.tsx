"use client";

import { useState, useEffect } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "How It Works", href: "#how-it-works" },
  { name: "Gallery", href: "#transformation-gallery" },
  { name: "Pricing", href: "#pricing" },
  { name: "Reviews", href: "#reviews" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 lg:px-6 lg:pt-5">
      {/* Box-shaped floating header */}
      <div
        className={cn(
          "mx-auto max-w-5xl rounded-2xl border transition-all duration-300",
          scrolled
            ? "border-border/80 bg-background/95 shadow-lg shadow-black/5 backdrop-blur-xl"
            : "border-border/50 bg-background/80 backdrop-blur-md"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            {/* Logo Mark */}
            <div className="relative flex h-9 w-9 items-center justify-center">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent to-accent/70" />
              {/* Inner icon */}
              <Sparkles className="relative h-4.5 w-4.5 text-accent-foreground" />
            </div>
            {/* Logo Text */}
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-foreground lg:text-lg">
                HeadshotAI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <Button
              className="bg-primary text-primary-foreground shadow-none transition-all hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "overflow-hidden border-t border-border/50 transition-all duration-300 lg:hidden",
            mobileOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 border-t-0"
          )}
        >
          <div className="px-4 py-4">
            <ul className="flex flex-col gap-1">
              {navLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4">
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground"
                onClick={() => window.location.reload()}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
