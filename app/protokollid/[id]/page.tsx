import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loeAndmestik } from "@/lib/data";
import { naaberKoosolekud } from "@/lib/derive";
import { taisnimi } from "@/lib/format";
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
import KoosolekuPais from "@/components/KoosolekuPais";

export function generateStaticParams() {
  return loeAndmestik().protokollid.filter((p) => p.koosolek_id && p.fail).map((p) => ({ id: p.koosolek_id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = loeAndmestik().protokollid.find((p) => p.koosolek_id === id);
  return { title: r ? `Koosolek ${kuupaevadEesti([r.kuupaev_1, r.kuupaev_2].filter(Boolean))} (protokoll)` : "Protokoll" };
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
  // eelmine/järgmine protokoll (koosolekud ilma protokollita jäetakse vahele)
  const failiga = new Set(andmed.protokollid.filter((x) => x.fail).map((x) => x.koosolek_id));
  const naabrid = naaberKoosolekud(andmed, id, (k) => failiga.has(k));
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
      <KoosolekuPais
        koosolek={koosolek}
        juhatajad={juhatajad}
        protokoll={rida}
        aktiivne="protokoll"
        eelmine={naabrid.eelmine}
        jargmine={naabrid.jargmine}
        arhiiviviide={
          <>
            Rahvusarhiiv, {p.arhiiviviide}, lk {esimeneLk}
            {viimaneLk !== esimeneLk && <>–{viimaneLk}</>}
            {" · "}
            <a href={korpuseFailiUrl(p.fail)} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
              Algne EstNLTK JSON (GitHub) ↗
            </a>
          </>
        }
        lisaRead={
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
        }
        tegevused={<ProtokollTegevused id={id} kuupaev={koosolek.kuupaev} viide={viide} />}
      />

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
