import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { loeAndmestik } from "@/lib/data";
import { ehitaOtsinguIndeks } from "@/lib/search-index";

/** Senine leheraam (menüü, globaalne otsing, jalus): koosseisud, koosolekud, protokollid, kontroll. */
export default function TavalineLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const indeks = ehitaOtsinguIndeks(loeAndmestik());
  return (
    <>
      <Nav indeks={indeks} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <Footer />
    </>
  );
}
