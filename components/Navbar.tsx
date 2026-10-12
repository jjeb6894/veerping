import Link from "next/link";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/pricing", label: "For Sellers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#why-trust-us", label: "Blog" },
  { href: "/#help", label: "Help" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" aria-label="TemplateChecklist home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link, index) => (
            <Link
              key={`${link.label}-${index}`}
              href={link.href}
              className={`text-sm font-medium transition hover:text-brand-600 ${index === 0 ? "text-brand-600 underline decoration-2 underline-offset-8" : "text-slate-700"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="hidden rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-600 sm:inline-flex">
            Log in
          </Link>
          <Link href="/search" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
