import Link from "next/link";
import type { ReactNode } from "react";
import { ABI } from "@/lib/abitekstid";
import { OLEMI_NIMED } from "@/lib/colors";
import { puhastaPealkiri } from "@/lib/protokollid/korpus";
import {
  kuvaTekst, plokiPealkiri, protokolliPlokid,
  type KoneYksus, type KuvaYksus, type MarkerYksus, type SegmentYksus,
} from "@/lib/protokollid/kuva";
import type { Olem, ProtokollAndmed } from "@/lib/protokollid/types";
import HelpTip from "./HelpTip";
import OlemPopover from "./OlemPopover";

/**
 * PT-03/PT-04: struktureeritud täistekst, renderdatakse build-ajal HTML-i (töötab ilma JS-ita).
 * Serverikomponent — suur tekst ei lähe RSC-propidena kliendile; interaktiivsus tuleb
 * väikestest saartest (OlemPopover, HelpTip) ja ProtokollJuht-ist (DOM-i kaudu).
 */
export default function ProtokollTekst({ p, nimed }: { p: ProtokollAndmed; nimed: Map<number, string> }) {
  const plokid = protokolliPlokid(p);
  const pole = p.paevakord.length === 0;
  return (
    <div id="protokoll-tekst" className="protokoll-tekst space-y-2">
      {pole && (
        <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-600">
          Päevakorrapunkte selles protokollis ei ole eristatud.
          <HelpTip tekst={ABI.paevakorrapunkt} />
        </p>
      )}
      {plokid.map((b) => {
        const { plokk } = b;
        const avatud = plokk.liik === "sissejuhatus" || plokk.liik === "tekst";
        const pealkiri = plokiPealkiri(p, plokk, puhastaPealkiri);
        // punkti pealkiri renderdatakse summary-s koos märgendusega; sisus jäetakse pealkirja segmendid vahele
        const pkLopp = plokk.liik === "punkt" ? plokk.pealkiri[1] : plokk.algus;
        const pealkirjaYksused = plokk.liik === "punkt" ? b.yksused.filter((y) => onEnne(y, pkLopp)) : [];
        const sisuYksused = plokk.liik === "punkt" ? b.yksused.filter((y) => !onEnne(y, pkLopp)) : b.yksused;
        return (
          <details
            key={b.id}
            id={b.id}
            open={avatud}
            className="plokk group rounded-lg border border-stone-200 bg-white"
            data-liik={plokk.liik}
            data-nr={plokk.liik === "punkt" ? plokk.nr : undefined}
          >
            <summary className="flex cursor-pointer select-none items-start gap-2 px-4 py-2.5 font-semibold leading-snug marker:text-stone-400">
              <span className="flex-1">
                {plokk.liik === "punkt" ? (
                  <>
                    <span className="text-stone-500">{plokk.nr}.</span>{" "}
                    {pealkirjaYksused.length > 0 ? (
                      <Yksused yksused={pealkirjaYksused} nimed={nimed} />
                    ) : (
                      pealkiri.replace(/^\d+\.\s*/, "")
                    )}
                  </>
                ) : (
                  pealkiri
                )}
              </span>
              {plokk.liik === "punkt" && (
                <button
                  type="button"
                  data-viide={plokk.nr}
                  className="no-print shrink-0 rounded border border-stone-300 px-1.5 py-0.5 text-xs font-normal text-stone-600 hover:bg-stone-100"
                  title="Kopeeri viide sellele päevakorrapunktile"
                >
                  viide
                </button>
              )}
            </summary>
            <div className="plokk-sisu border-t border-stone-100 px-4 py-3 leading-relaxed">
              {plokk.liik === "lisa" && (
                <p className="mb-2 text-xs text-stone-500">
                  Lisa <HelpTip tekst={ABI.protokolliLisa} />
                </p>
              )}
              <Yksused yksused={sisuYksused} nimed={nimed} />
            </div>
          </details>
        );
      })}
    </div>
  );
}

function onEnne(y: KuvaYksus, koht: number): boolean {
  if (y.liik === "segment") return y.segment.lopp <= koht;
  if (y.liik === "marker") return y.koht < koht;
  // kõne pealkirja sees: kuulub pealkirja alla, kui kõik tema üksused lõpevad enne
  return y.osad.every((o) => o.yksused.every((x) => onEnne(x, koht)));
}

/**
 * Üksuste jada; järjestikused reavahetusi säilitavad segmendid (tabel / loendileht) pannakse
 * ühte `.sailita` ümbrisesse (pre-wrap pärandub), et HTML-i maht ei kasvaks segmendi kaupa.
 */
function Yksused({ yksused, nimed }: { yksused: (KuvaYksus | SegmentYksus | MarkerYksus)[]; nimed: Map<number, string> }) {
  const tul: ReactNode[] = [];
  let grupp: SegmentYksus[] = [];
  const lopetaGrupp = () => {
    if (grupp.length === 0) return;
    tul.push(
      <span key={`s${tul.length}`} className="sailita">
        {grupp.map((y, i) => <Seg key={i} y={y} nimed={nimed} />)}
      </span>
    );
    grupp = [];
  };
  yksused.forEach((y, i) => {
    if (y.liik === "segment" && y.sailita) {
      grupp.push(y);
      return;
    }
    lopetaGrupp();
    if (y.liik === "marker") tul.push(<Marker key={i} y={y} />);
    else if (y.liik === "segment") tul.push(<Seg key={i} y={y} nimed={nimed} />);
    else tul.push(<Kone key={i} y={y} nimed={nimed} />);
  });
  lopetaGrupp();
  return <>{tul}</>;
}

function Marker({ y }: { y: MarkerYksus }) {
  const { leht } = y;
  const silt = leht.tekstita ? `lk ${leht.lk} (tekstita leht)` : `lk ${leht.lk}`;
  return (
    <a
      id={`lk-${leht.lk}`}
      href={`?lk=${encodeURIComponent(leht.lk)}`}
      className="lehemarker"
      data-lk={leht.lk}
      title={`Arhiivi lehekülg ${leht.lk} — ava originaalpilt`}
    >
      {silt}
    </a>
  );
}

function Seg({ y, nimed }: { y: SegmentYksus; nimed: Map<number, string> }) {
  const s = y.segment;
  const tekst = kuvaTekst(s.tekst, y.sailita);
  const sisu: ReactNode = tekst;
  if (!s.olem) return <>{sisu}</>;
  return <OlemSpan olem={s.olem} sisu={sisu} toor={s.tekst} nimed={nimed} />;
}

function OlemSpan({ olem, sisu, toor, nimed }: { olem: Olem; sisu: ReactNode; toor: string; nimed: Map<number, string> }) {
  const tyyp = OLEMI_NIMED[olem.t];
  const puhas = toor.replace(/\s+/g, " ").trim();
  const klass = `olem olem-${olem.t}`;
  if (olem.t === "PER") {
    if (olem.isik_id !== null && (olem.kindlus === "kõrge" || olem.kindlus === "keskmine")) {
      const nimi = nimed.get(olem.isik_id) ?? String(olem.isik_id);
      return (
        <Link
          href={`/isikud/${olem.isik_id}/`}
          className={`${klass} olem-seotud`}
          data-isik={olem.isik_id}
          data-tip={`${tyyp}: ${puhas} — ${nimi} (${olem.kindlus})`}
        >
          {sisu}
        </Link>
      );
    }
    if (olem.isik_id !== null && olem.kindlus === "mitmene") {
      const nimi = nimed.get(olem.isik_id) ?? String(olem.isik_id);
      return (
        <Link
          href={`/isikud/${olem.isik_id}/`}
          className={`${klass} olem-seotud olem-mitmene`}
          data-isik={olem.isik_id}
          data-tip={`${tyyp}: ${puhas} — tõenäoliselt ${nimi} (mitmene: sama nimega mainitakse ka teisi isikuid)`}
        >
          {sisu}
          <sup className="olem-kysimark" aria-label="mitmene vaste">?</sup>
        </Link>
      );
    }
    if (olem.kindlus === "mitmene" && olem.kandidaadid.length >= 2) {
      const kandidaadid = olem.kandidaadid.map((id) => ({ id, nimi: nimed.get(id) ?? String(id) }));
      return (
        <OlemPopover
          tekst={puhas}
          tip={`${tyyp}: ${puhas} — mitmene (${kandidaadid.map((k) => k.nimi).join(" / ")})`}
          kandidaadid={kandidaadid}
          className={`${klass} olem-mitmene`}
        />
      );
    }
    return (
      <span className={`${klass} olem-sidumata`} data-tip={`${tyyp}: ${puhas} (sidumata)`}>
        {sisu}
      </span>
    );
  }
  if (olem.t === "ORG") {
    return (
      <Link
        href={`/protokollid/?q=${encodeURIComponent(puhas)}`}
        className={klass}
        data-tip={`${tyyp}: ${puhas} — otsi teisi mainimisi`}
      >
        {sisu}
      </Link>
    );
  }
  return (
    <span className={klass} data-tip={`${tyyp}: ${puhas}`}>
      {sisu}
    </span>
  );
}

function Kone({ y, nimed }: { y: KoneYksus; nimed: Map<number, string> }) {
  return (
    <span className="kone" data-kone={y.indeks}>
      <span className="kone-silt no-print">
        kõne · automaatselt tuvastatud
        <HelpTip tekst={ABI.kone} />
      </span>
      {y.osad.map((o, i) =>
        o.roll === "koneleja" ? (
          <strong key={i} className="koneleja">
            <Yksused yksused={o.yksused} nimed={nimed} />
          </strong>
        ) : o.roll === "kone" ? (
          <span key={i} className="kone-tykk">
            <Yksused yksused={o.yksused} nimed={nimed} />
          </span>
        ) : (
          <span key={i} className="kone-vahe">
            <Yksused yksused={o.yksused} nimed={nimed} />
          </span>
        )
      )}
    </span>
  );
}
