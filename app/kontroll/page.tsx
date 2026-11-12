import type { Metadata } from "next";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { loeAndmestik } from "@/lib/data";
import { liikmeteArvuSeeria } from "@/lib/derive";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti } from "@/lib/format";
import {
  KONTROLLID, KONTROLLITA_KOOSSEIS, KOOSSEISUTA, KT03_NIMI, kokkuvote, kontrollid,
  type KontrolliVoti,
} from "@/lib/kontroll";
import KontrollTabel from "@/components/KontrollTabel";
import KontrollJoonis from "@/components/KontrollJoonis";

/** 5a: andmete omaniku tööriist — ei ole menüüs, otsingus ega sisemistes linkides. */
export const metadata: Metadata = {
  title: "Andmete kontroll",
  robots: { index: false, follow: false },
};

/** Viimase data/ muudatuse aeg git-ist (build-ajal); varuks failide muutmisaeg. */
function andmeteSeis(): string {
  try {
    const iso = execSync("git log -1 --format=%cI -- data", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (iso) return `${kuupaevEesti(iso.slice(0, 10))} ${iso.slice(11, 16)} (viimane data/ commit)`;
  } catch {
    /* git puudub */
  }
  const mtime = fs.statSync(path.join(process.cwd(), "data", "isikud.csv")).mtime.toISOString();
  return `${kuupaevEesti(mtime.slice(0, 10))} ${mtime.slice(11, 16)} (failide muutmisaeg)`;
}

const PLOKK: Record<KontrolliVoti, string> = {
  kt01: "kt01", kt02: "kt02", kt03a: "kt03", kt03b: "kt03", kt03c: "kt03", kt03d: "kt03", kt03e: "kt03",
  kt04a: "kt04a", kt04b: "kt04b", kt05a: "kt05a", kt05b: "kt05b", kt05c: "kt05c",
};

export default function KontrollLeht() {
  const andmed = loeAndmestik();
  const k = kontrollid(andmed);
  const tabel = kokkuvote(andmed, k);
  const nimi = new Map(andmed.isikud.map((i) => [i.isik_id, `${i.eesnimi} ${i.perenimi}`]));
  const isikuNimi = (id: number | null) => (id === null ? "" : nimi.get(id) ?? "");
  const kinnitusKokku = [...k.kt03.kinnitusread.values()].reduce((a, b) => a + b, 0);

  const ridu: [string, number][] = [
    ["isikud", andmed.isikud.length], ["koosseisud", andmed.koosseisud.length],
    ["koosolekud", andmed.koosolekud.length], ["koosolek_juhatajad", andmed.juhatajad.length],
    ["muutused", andmed.muutused.length], ["valimised", andmed.valimised.length],
    ["osavott", andmed.osavott.length],
  ];

  return (
    <div className="space-y-10">
      <header>
        <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Andmete kontrollleht — mõeldud testimiseks, mitte avalikuks kasutuseks
        </p>
        <h1 className="text-2xl font-bold">Tabelite omavaheline vastavus</h1>
        <p className="mt-1 text-sm text-stone-600">
          Andmete seis: {andmeteSeis()}. Ridu:{" "}
          {ridu.map(([t, n]) => `${t} ${n}`).join(", ")}.
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Liikmelisus arvutatakse samamoodi kui rakenduses (erireegel 1: valitud + muutused kuupäevani).
          Leiud on andmevastuolud, mida koodis ei lahendata — parandused tehakse Excelis
          (rea tunnus: <code>muutus_id</code> = <code>jk_kronol</code>, <code>koosolek_id</code> = Exceli rea järjekord).
          Koosseis {KONTROLLITA_KOOSSEIS} on kontrollidest väljas: linnavalitsuse liikmeid pole isikute tabelis.
        </p>
      </header>

      {/* KT-06 */}
      <section id="kokkuvote" aria-labelledby="kokkuvote-h">
        <h2 id="kokkuvote-h" className="mb-2 text-xl font-bold">KT-06 Kokkuvõte</h2>
        <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-100 text-stone-700">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">Koosseis</th>
                {KONTROLLID.map((c) => (
                  <th key={c.voti} scope="col" className="px-2 py-2 text-right" title={c.nimi}>
                    <a href={`#${PLOKK[c.voti]}`} className="hover:underline">{c.silt}</a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...tabel].map(([koosseis, rida]) => (
                <tr key={koosseis} className="border-t border-stone-100">
                  <th scope="row" className="px-3 py-1.5 text-left font-medium">
                    {koosseis === KOOSSEISUTA ? "koosseisuta" : koosseis}
                  </th>
                  {KONTROLLID.map((c) => {
                    const n = rida[c.voti];
                    const siht = c.voti === "kt01" ? `kt01-${koosseis}` : PLOKK[c.voti];
                    return (
                      <td key={c.voti} className="px-2 py-1.5 text-right tabular-nums">
                        {n > 0 ? (
                          <a href={`#${siht}`} className="font-semibold text-red-700 hover:underline">{n}</a>
                        ) : (
                          <span className="text-stone-400">0</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-2 grid gap-x-6 text-xs text-stone-600 sm:grid-cols-2">
          {KONTROLLID.map((c) => (
            <li key={c.voti}><strong>{c.silt}</strong> {c.nimi}</li>
          ))}
        </ul>
      </section>

      {/* KT-01 */}
      <section id="kt01" aria-labelledby="kt01-h" className="space-y-6">
        <div>
          <h2 id="kt01-h" className="text-xl font-bold">KT-01 Liikmete arv ajas</h2>
          <p className="text-sm text-stone-600">
            Tuletatud liikmete arv koosoleku päeval vs protokollis kirjas olev volikogu suurus
            (<code>koosolekud.koosseis_arv</code>). Erinevus = tuletatud − protokoll.
          </p>
        </div>
        {andmed.koosseisud.filter((ks) => ks.koosseis_id !== KONTROLLITA_KOOSSEIS).map((ks) => {
          const read = k.kt01.filter((r) => r.koosseis_id === ks.koosseis_id);
          if (read.length === 0) return null;
          const algus = ks.esimene_koosolek || read[0].kuupaev;
          const lopp = ks.viimane_koosolek || read[read.length - 1].kuupaev;
          const erinevusi = read.filter((r) => r.erinevus).length;
          return (
            <div key={ks.koosseis_id} id={`kt01-${ks.koosseis_id}`} className="scroll-mt-20">
              <h3 className="mb-1 font-semibold">
                <Link href={`/koosseisud/${ks.koosseis_id}/`} className="hover:underline">{ks.koosseis_id}</Link>
                <span className="ml-2 text-sm font-normal text-stone-600">
                  {read.length} koosolekut, protokollis suurus {read.filter((r) => r.koosseis_arv !== null).length}, erinevusi {erinevusi}
                </span>
              </h3>
              <KontrollJoonis
                algus={algus}
                lopp={lopp}
                seeria={liikmeteArvuSeeria(andmed, ks.koosseis_id, algus, lopp)}
                punktid={read.filter((r) => r.koosseis_arv !== null).map((r) => ({
                  koosolek_id: r.koosolek_id, kuupaev: r.kuupaev, protokoll: r.koosseis_arv!, tuletatud: r.tuletatud,
                }))}
                varv={koosseisuVarv(ks.koosseis_id)}
              />
              <KontrollTabel
                failinimi={`tlv-kontroll-kt01-${ks.koosseis_id}`}
                erinevus="erinevus"
                read={read.map((r) => ({ ...r }))}
                veerud={[
                  { key: "kuupaev", pealkiri: "Kuupäev" },
                  { key: "koosolek_id", pealkiri: "Koosolek", link: "koosolek" },
                  { key: "tuletatud", pealkiri: "Tuletatud liikmeid", arv: true },
                  { key: "koosseis_arv", pealkiri: "Protokollis (koosseis_arv)", arv: true },
                  { key: "erinevus", pealkiri: "Erinevus", arv: true },
                ]}
              />
            </div>
          );
        })}
      </section>

      {/* KT-02 */}
      <section id="kt02" aria-labelledby="kt02-h" className="scroll-mt-20">
        <h2 id="kt02-h" className="text-xl font-bold">KT-02 Kohalolu bilanss</h2>
        <p className="mb-2 text-sm text-stone-600">
          Koosolekud, kus protokoll ütleb kohalolijate arvu: kohal + protokollis nimetatud puudujad (kõik nimed,
          ka sidumata) vs tuletatud liikmete arv. Kahepäevastel koosolekutel mõlemad päevad.
        </p>
        <KontrollTabel
          failinimi="tlv-kontroll-kt02"
          erinevus="erinevus"
          vaikimisiErinevused
          read={k.kt02.map((r) => ({ ...r }))}
          veerud={[
            { key: "kuupaev", pealkiri: "Kuupäev" },
            { key: "koosolek_id", pealkiri: "Koosolek", link: "koosolek" },
            { key: "koosseis_id", pealkiri: "Koosseis", link: "koosseis" },
            { key: "paev", pealkiri: "Päev", arv: true },
            { key: "kohal", pealkiri: "Kohal (protokoll)", arv: true },
            { key: "puudujaid", pealkiri: "Puudujaid nimetatud", arv: true },
            { key: "tuletatud", pealkiri: "Tuletatud liikmeid", arv: true },
            { key: "erinevus", pealkiri: "Erinevus", arv: true },
          ]}
        />
      </section>

      {/* KT-03 */}
      <section id="kt03" aria-labelledby="kt03-h" className="scroll-mt-20">
        <h2 id="kt03-h" className="text-xl font-bold">KT-03 Muutuste loogika</h2>
        <p className="mb-2 text-sm text-stone-600">
          Muutused kronoloogiliselt reegli 1 järgi. {(["a", "b", "c", "d", "e"] as const).map((t) => `(${t}) ${KT03_NIMI[t]}`).join("; ")}.
          Esimese koosoleku kinnitusread (UX-06 „kinnitamine“) ei ole vead: kokku {kinnitusKokku}
          {" "}({[...k.kt03.kinnitusread].map(([ks, n]) => `${ks} ${n}`).join(", ")}).
        </p>
        <KontrollTabel
          failinimi="tlv-kontroll-kt03"
          read={k.kt03.leiud.map((l) => ({ ...l, nimi: isikuNimi(l.isik_id) }))}
          veerud={[
            { key: "tyyp", pealkiri: "Liik" },
            { key: "muutus_id", pealkiri: "Muutus", muutus: true },
            { key: "kuupaev", pealkiri: "Kuupäev" },
            { key: "koosseis_id", pealkiri: "Koosseis", link: "koosseis" },
            { key: "isik_id", pealkiri: "Isik", link: "isik" },
            { key: "nimi", pealkiri: "Nimi" },
            { key: "liik", pealkiri: "Muutuse liik" },
            { key: "kirjeldus", pealkiri: "Kirjeldus" },
          ]}
        />
      </section>

      {/* KT-04 */}
      <section id="kt04a" aria-labelledby="kt04-h" className="scroll-mt-20">
        <h2 id="kt04-h" className="text-xl font-bold">KT-04 Osavõtt vs liikmelisus</h2>
        <h3 className="mt-3 mb-1 font-semibold">(a) Protokollis nimetatud, kuid koosoleku päeval polnud liige</h3>
        <p className="mb-2 text-sm text-stone-600">Osavõtu read sidumise kindlusega kõrge või keskmine.</p>
        <KontrollTabel
          failinimi="tlv-kontroll-kt04a"
          read={k.kt04.filter((l) => l.tyyp === "mitte_liige").map((l) => ({ ...l, nimi: isikuNimi(l.isik_id) }))}
          veerud={[
            { key: "kuupaev", pealkiri: "Kuupäev" },
            { key: "koosolek_id", pealkiri: "Koosolek", link: "koosolek" },
            { key: "koosseis_id", pealkiri: "Koosseis", link: "koosseis" },
            { key: "staatus", pealkiri: "Staatus" },
            { key: "nimi_toor", pealkiri: "Nimi protokollis" },
            { key: "isik_id", pealkiri: "Isik", link: "isik" },
            { key: "nimi", pealkiri: "Seotud isik" },
            { key: "sidumise_kindlus", pealkiri: "Kindlus" },
          ]}
        />
        <h3 id="kt04b" className="mt-6 mb-1 scroll-mt-20 font-semibold">(b) Liikmed, keda ühelgi koosseisu koosolekul ei nimetata</h3>
        <p className="mb-2 text-sm text-stone-600">
          Arvesse lähevad liikmed, kes olid liikmed vähemalt ühel koosolekul, mille protokoll loetleb kohalolijad nimeliselt.
        </p>
        <KontrollTabel
          failinimi="tlv-kontroll-kt04b"
          read={k.kt04.filter((l) => l.tyyp === "nimetamata").map((l) => ({
            koosseis_id: l.koosseis_id, isik_id: l.isik_id, nimi: isikuNimi(l.isik_id),
          }))}
          veerud={[
            { key: "koosseis_id", pealkiri: "Koosseis", link: "koosseis" },
            { key: "isik_id", pealkiri: "Isik", link: "isik" },
            { key: "nimi", pealkiri: "Nimi" },
          ]}
        />
      </section>

      {/* KT-05 */}
      <section id="kt05a" aria-labelledby="kt05-h" className="scroll-mt-20">
        <h2 id="kt05-h" className="text-xl font-bold">KT-05 Isikud</h2>
        <h3 className="mt-3 mb-1 font-semibold">(a) Liikmeks saamise kirje puudub (PA-06)</h3>
        <p className="mb-2 text-sm text-stone-600">
          Isikul pole valitud-rida ega liitumist, kuid muutustes või protokollide osavõtus on tõendeid liikmelisusest.
        </p>
        <KontrollTabel
          failinimi="tlv-kontroll-kt05a"
          read={k.kt05.filter((l) => l.tyyp === "kirjeta").map((l) => ({ ...l, nimi: isikuNimi(l.isik_id) }))}
          veerud={[
            { key: "isik_id", pealkiri: "Isik", link: "isik" },
            { key: "nimi", pealkiri: "Nimi" },
            { key: "koosseis_id", pealkiri: "Koosseis", link: "koosseis" },
            { key: "kirjeldus", pealkiri: "Tõendid" },
          ]}
        />
        <h3 id="kt05b" className="mt-6 mb-1 scroll-mt-20 font-semibold">(b) Ainult isikute tabelis</h3>
        <KontrollTabel
          failinimi="tlv-kontroll-kt05b"
          read={k.kt05.filter((l) => l.tyyp === "ainult_isikutes").map((l) => ({ ...l, nimi: isikuNimi(l.isik_id) }))}
          veerud={[
            { key: "isik_id", pealkiri: "Isik", link: "isik" },
            { key: "nimi", pealkiri: "Nimi" },
            { key: "kirjeldus", pealkiri: "Märkus" },
          ]}
        />
        <h3 id="kt05c" className="mt-6 mb-1 scroll-mt-20 font-semibold">(c) Juhataja polnud juhatamise päeval liige</h3>
        <KontrollTabel
          failinimi="tlv-kontroll-kt05c"
          read={k.kt05.filter((l) => l.tyyp === "juhataja").map((l) => ({ ...l, nimi: isikuNimi(l.isik_id) }))}
          veerud={[
            { key: "kuupaev", pealkiri: "Kuupäev" },
            { key: "koosolek_id", pealkiri: "Koosolek", link: "koosolek" },
            { key: "koosseis_id", pealkiri: "Koosseis", link: "koosseis" },
            { key: "isik_id", pealkiri: "Isik", link: "isik" },
            { key: "nimi", pealkiri: "Nimi" },
          ]}
        />
      </section>
    </div>
  );
}
