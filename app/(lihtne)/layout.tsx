/**
 * DS-02: avaleht, isikute nimekiri ja isiku leht — ilma Nav-i ja globaalse otsinguta (OTSUS).
 * Iga leht kasutab ise `components/LihtneLeht.tsx` raami (tagasilink sõltub lehest).
 */
export default function LihtneLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
