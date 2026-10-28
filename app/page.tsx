import Link from "next/link";
import { loeAndmestik } from "@/lib/data";
import { arvutaFaktid } from "@/lib/faktid";
import Ajatelg from "@/components/Ajatelg";
import FaktiKarussell from "@/components/FaktiKarussell";

export default function Avaleht() {
  const andmed = loeAndmestik();
  const faktid = arvutaFaktid(andmed);

  const statistika = [
    { arv: andmed.koosseisud.length, silt: "koosseisu", href: "/koosseisud/" },
    { arv: andmed.isikud.length, silt: "isikut", href: "/isikud/" },
    {
      arv: andmed.koosolekud.length, silt: "koosolekut", href: "/koosolekud/",
      alamsilt: `${andmed.protokollid.filter((p) => p.fail).length} protokolli täistekstiga`,
    },
    { arv: andmed.muutused.length, silt: "liikmesmuutust", href: "/koosseisud/" },
  ];

  return (
    <div className="space-y-10">
      <section className="pt-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">
          Tartu Linnavolikogu 1917–1941
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-stone-600">
          Tartu linna esinduskogu ajalugu esimestest demokraatlikest valimistest
          1917. aastal kuni nõukogude okupatsioonini: {andmed.isikud.length}{" "}
          isikut, {andmed.koosseisud.length} koosseisu,{" "}
          {andmed.koosolekud.length} koosolekut ja {andmed.muutused.length}{" "}
          liikmesmuutust Rahvusarhiivi protokollide põhjal.
        </p>
      </section>

      <section aria-labelledby="ajatelg-pealkiri">
        <h2 id="ajatelg-pealkiri" className="mb-3 text-xl font-semibold">
          Koosseisud ajateljel
        </h2>
        <Ajatelg koosseisud={andmed.koosseisud} />
      </section>

      <section aria-label="Võtmestatistika" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statistika.map((s) => (
          <Link
            key={s.silt}
            href={s.href}
            className="rounded-lg border border-stone-200 bg-white p-4 text-center transition-shadow hover:shadow-md"
          >
            <span className="block font-serif text-3xl font-bold">{s.arv}</span>
            <span className="text-sm text-stone-600">{s.silt}</span>
            {"alamsilt" in s && s.alamsilt && (
              <span className="mt-0.5 block text-xs text-stone-500">{s.alamsilt}</span>
            )}
          </Link>
        ))}
      </section>

      <section aria-label="Kolm teed andmetesse" className="grid gap-3 md:grid-cols-3">
        <Link
          href="/isikud/"
          className="rounded-lg border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold">Volinikud →</h3>
          <p className="mt-1 text-sm text-stone-600">
            Otsi ja sirvi kõiki {andmed.isikud.length} volikogus tegutsenud
            isikut: elulood, karjäärid, valimised.
          </p>
        </Link>
        <Link
          href="/koosolekud/"
          className="rounded-lg border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold">Koosolekud ja protokollid →</h3>
          <p className="mt-1 text-sm text-stone-600">
            {andmed.koosolekud.length} protokollitud koosolekut aastatest
            1918–1941: juhatajad, osavõtjad, vormid ning protokollide täistekst ja otsing.
          </p>
        </Link>
        <Link
          href="/koosseisud/"
          className="rounded-lg border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold">Koosseisud →</h3>
          <p className="mt-1 text-sm text-stone-600">
            Üheksa valimisperioodi 1917–1941: poliitiline jaotus, liikmed ja
            muutused.
          </p>
        </Link>
      </section>

      <FaktiKarussell faktid={faktid} />
    </div>
  );
}
