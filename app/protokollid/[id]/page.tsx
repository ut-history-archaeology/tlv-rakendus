import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loeAndmestik } from "@/lib/data";
import { koosseisuVarv } from "@/lib/colors";
import { kuupaevEesti, taisnimi } from "@/lib/format";
import { ABI } from "@/lib/abitekstid";
import { loeProtokollAndmed } from "@/lib/protokollid/loe";
import { korpuseFailiUrl } from "@/lib/protokollid/laadi";
import { koostaViide, kuupaevadEesti } from "@/lib/protokollid/viide";
import { leheplokid } from "@/lib/protokollid/kuva";
import type { ViiteBaas } from "@/lib/protokollid/viide-klient";
import HelpTip from "@/components/HelpTip";
import OlemiLegend from "@/components/OlemiLegend";
import ProtokollJuht from "@/components/ProtokollJuht";
import ProtokollTegevused from "@/components/ProtokollTegevused";
import ProtokollTekst from "@/components/ProtokollTekst";
import ParalleelVaade from "@/components/ParalleelVaade";
import KirjakujuVaade from "@/components/KirjakujuVaade";

export function generateStaticParams() {
  return loeAndmestik().protokollid.filter((p) => p.koosolek_id && p.fail).map((p) => ({ id: p.koosolek_id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = loeAndmestik().protokollid.find((p) => p.koosolek_id === id);
  return { title: r ? `Protokoll ${kuupaevadEesti([r.kuupaev_1, r.kuupaev_2].filter(Boolean))}` : "Protokoll" };
}

export default async function ProtokolliLeht({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const andmed = loeAndmestik();
  const rida = andmed.protokollid.find((p) => p.koosolek_id === id);
  const koosolek = andmed.koosolekud.find((k) => k.koosolek_id === id);
  const p = loeProtokollAndmed(id);
  if (!rida || !koosolek || !p) notFound();

  const nimed = new Map(andmed.isikud.map((i) => [i.isik_id, taisnimi(i)]));
  const juhatajad = andmed.juhatajad.filter((j) => j.koosolek_id === id);
  const kuupaevad = [koosolek.kuupaev, koosolek.kuupaev_lopp].filter(Boolean);
  const on1940 = koosolek.koosseis_id === "1940-1941";
  const esimeneLk = p.lehed[0]?.lk ?? rida.esimene_lk;
  const viimaneLk = p.lehed[p.lehed.length - 1]?.lk ?? rida.viimane_lk;
  const viide: ViiteBaas = {
    kuupaevad,
    arhiiviviide: p.arhiiviviide,
    esimeneLk,
    viimaneLk,
    transkribusUrl: p.transkribus_url,
  };
  const s = p.statistika;
  // PT-08: kliendipoolse (moderniseeritud) renderduse jaoks ainult selles protokollis esinevad nimed
  const protokolliNimed: Record<string, string> = {};
  for (const o of p.olemid) {
    for (const iid of [o.isik_id, ...o.kandidaadid]) if (iid !== null && nimed.has(iid)) protokolliNimed[iid] = nimed.get(iid)!;
  }
  const prindiViide = koostaViide({ ...viide, leheUrl: `https://ut-history-archaeology.github.io/tlv-rakendus/protokollid/${id}/` });

  return (
    <div className="space-y-6">
      <nav aria-label="Asukoht" className="no-print text-sm text-stone-500">
        <Link href="/protokollid/" className="hover:underline">← Kõik protokollid</Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Protokoll {kuupaevadEesti(kuupaevad)}</h1>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Vorm: </dt>
              <dd className="inline">
                {koosolek.vorm}
                {koosolek.vorm === "erakorraline" && <HelpTip tekst={ABI.erakorraline} />}
                {koosolek.vorm === "linnavalitsus linnavolikogu ülesandeis" && <HelpTip tekst={ABI.linnavalitsusVolikoguYlesandeis} />}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Koosseis: </dt>
              <dd className="inline">
                <Link href={`/koosseisud/${koosolek.koosseis_id}/`} className="inline-flex items-center gap-1.5 hover:underline">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: koosseisuVarv(koosolek.koosseis_id) }} aria-hidden />
                  {koosolek.koosseis_id}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Juhataja: </dt>
              <dd className="inline">
                {juhatajad.length === 0 && (koosolek.juhataja || "—")}
                {juhatajad.map((j, i) => (
                  <span key={i}>
                    {i > 0 && "; "}
                    {j.isik_id !== null ? (
                      <Link href={`/isikud/${j.isik_id}/`} className="text-blue-700 hover:underline">{j.juhataja_nimi}</Link>
                    ) : (
                      j.juhataja_nimi
                    )}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Koosolek: </dt>
              <dd className="inline">
                <Link href={`/koosolekud/${id}/`} className="text-blue-700 hover:underline">
                  Koosoleku andmed (kohalolu, juhataja) →
                </Link>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline font-medium">Arhiiviviide: </dt>
              <dd className="inline">
                Rahvusarhiiv, {p.arhiiviviide}, lk {esimeneLk}
                {viimaneLk !== esimeneLk && <>–{viimaneLk}</>}
                {" · "}
                <a href={p.transkribus_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  Ava Transkribuses ↗
                </a>
                {" · "}
                <a href={korpuseFailiUrl(p.fail)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  Algne EstNLTK JSON (GitHub) ↗
                </a>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline font-medium">Statistika: </dt>
              <dd className="inline text-stone-700">
                {s.paevakorrapunkte} päevakorrapunkti
                <HelpTip tekst={ABI.paevakorrapunkt} /> · {s.sonu.toLocaleString("et")} sõna · {s.konesid} kõnet · {s.lehekylgi} lehekülge
                {s.lehekylgi_tekstita > 0 && <> (neist {s.lehekylgi_tekstita} tekstita)</>}
                {s.lisasid > 0 && <> · {s.lisasid} lisa</>}
                {" · "}
                {s.olemeid} nimeüksust ({s.seotud_isikuid} seotud isikut)
              </dd>
            </div>
          </dl>
        </div>
        <ProtokollTegevused id={id} kuupaev={koosolek.kuupaev} viide={viide} />
      </header>

      {rida.markus && rida.markus !== "käsitsi vaste" && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Märkus andmete kohta:</strong> {rida.markus}
        </p>
      )}
      {on1940 && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {ABI.linnavalitsusVolikoguYlesandeis} Sidumata isikunimed on teadlik andmelünk: nõukogude perioodi
          linnavalitsuse liikmed puuduvad volinike andmestikust.
        </p>
      )}

      <OlemiLegend konteinerId="protokoll-tekst" />
      <ProtokollJuht viide={viide} />
      <ParalleelVaade
        lehed={p.lehed}
        kuupaevTekst={kuupaevadEesti(kuupaevad)}
        arhiiviviide={p.arhiiviviide}
        transkribusUrl={p.transkribus_url}
        viide={viide}
        leheplokid={Object.fromEntries(leheplokid(p))}
      >
        <KirjakujuVaade id={id} nimed={protokolliNimed} sonu={s.sonu}>
          <ProtokollTekst p={p} nimed={nimed} />
        </KirjakujuVaade>
      </ParalleelVaade>

      <p className="text-xs text-stone-500">
        Tekst on OCR-i ja automaatse märgenduse tulemus; osa sõnu võib olla valesti loetud.
        Originaalid: Rahvusarhiiv, {p.arhiiviviide}; täislahutuses Transkribuses.
      </p>
      <p className="print-only text-xs">Viide: {prindiViide}</p>
    </div>
  );
}
