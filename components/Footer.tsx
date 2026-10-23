import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
            Trusted by buyers and sellers who want clearer listing information before they commit.
          </p>
          <div className="mt-5 flex gap-3 text-slate-500">
            <span aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">f</span>
            <span aria-label="Twitter" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">t</span>
            <span aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">◎</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/#how-it-works" className="hover:text-brand-600">How It Works</Link></li>
            <li><Link href="/pricing" className="hover:text-brand-600">For Sellers</Link></li>
            <li><Link href="/pricing" className="hover:text-brand-600">Pricing</Link></li>
            <li><Link href="/search" className="hover:text-brand-600">Templates</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Resources</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/#why-trust-us" className="hover:text-brand-600">Blog</Link></li>
            <li><Link href="/#help" className="hover:text-brand-600">Help Center</Link></li>
            <li><Link href="/search" className="hover:text-brand-600">Trust Center</Link></li>
            <li><Link href="/#whats-new" className="hover:text-brand-600">What&apos;s New</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/#why-trust-us" className="hover:text-brand-600">About Us</Link></li>
            <li><Link href="/#help" className="hover:text-brand-600">Contact</Link></li>
            <li><Link href="/pricing" className="hover:text-brand-600">Partners</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} TemplateChecklist.com. Some provider checks may be unavailable until their data source is connected.
        {" "}
        <a href="https://templatechecklist.com/" className="hover:text-brand-600">
          connected into the veerping repo
        </a>
      </div>
    </footer>
  );
}
