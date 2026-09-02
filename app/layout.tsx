import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { loeAndmestik } from "@/lib/data";
import { ehitaOtsinguIndeks } from "@/lib/search-index";

export const metadata: Metadata = {
  title: {
    default: "Tartu Linnavolikogu 1917–1941",
    template: "%s — Tartu Linnavolikogu 1917–1941",
  },
  description:
    "Tartu Linnavolikogu ajalooandmestik 1917–1941: 404 isikut, 9 koosseisu, 337 koosolekut.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const indeks = ehitaOtsinguIndeks(loeAndmestik());
  return (
    <html lang="et">
      <body className="min-h-screen">
        <Nav indeks={indeks} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
