import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://templatechecklist.com"),
  title: "TemplateChecklist.com — Check Any Listing in Seconds",
  description:
    "Prepare a clear listing report with vehicle details, VIN checks, seller signals, and a trust score.",
  openGraph: {
    title: "TemplateChecklist.com — Check Any Listing in Seconds",
    description:
      "Review listing details and trust signals before you buy or sell.",
    url: "https://templatechecklist.com/",
    siteName: "TemplateChecklist.com",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <aside
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950"
        >
          Automated preview: listing details are read from the submitted link when available. Any unavailable provider checks are shown clearly.
        </aside>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
