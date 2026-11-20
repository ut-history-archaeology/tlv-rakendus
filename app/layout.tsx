import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

/*
 * DS-01: kirjatüübid laaditakse build-ajal (next/font), jooksvalt välisvõrku ei pöörduta.
 * CSS-muutujad on kõigil lehtedel olemas, kuid neid kasutab ainult lihtne leheraam
 * (`.lihtne`, components/LihtneLeht.tsx); teiste lehtede kirjad ei muutu.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tartu Linnavolikogu 1917–1941",
    template: "%s — Tartu Linnavolikogu 1917–1941",
  },
  description:
    "Tartu Linnavolikogu ajalooandmestik 1917–1941: 404 isikut, 9 koosseisu, 338 koosolekut.",
};

/** Juurlayout: ainult <html>/<body>. Leheraam tuleb route group'i layoutist ((tavaline) / (lihtne)). */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="et" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
