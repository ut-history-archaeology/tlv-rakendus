"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/protokollid/laadi";
import { pildiUrl } from "@/lib/protokollid/lehed";
import type { Leht } from "@/lib/protokollid/types";

const MIN = 1;
const MAX = 4;

/**
 * PT-05 pildipaneeli keskosa: aktiivse lehe 1200-pilt, suurendus 1×…4× (nupud, Ctrl+ratas,
 * puutel kahe näpuga, topeltklõps = 2×) ja lohistamine (hiir, puude). CSS `transform`, canvas-t pole.
 * Pilt vahetub ilma hüppeta: eelmine jääb, kuni uus on laetud; konteineril on fikseeritud kõrgus.
 */
export default function LehePilt({ leht, alt, kirjeldus }: { leht: Leht; alt: string; kirjeldus?: string }) {
  const src = pildiUrl(BASE_PATH, 1200, leht.pilt);
  const [kuvatud, setKuvatud] = useState<string>(src);
  const [laen, setLaen] = useState(false);
  const [viga, setViga] = useState(false);
  const [vaade, setVaade] = useState({ s: 1, x: 0, y: 0 });
  const konteiner = useRef<HTMLDivElement>(null);
  const lohistus = useRef<{ id: number; x: number; y: number; vx: number; vy: number } | null>(null);
  const naputid = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; s: number } | null>(null);

  // uue pildi eellaadimine; vana jääb, kuni uus on valmis
  useEffect(() => {
    if (src === kuvatud) return;
    let katkestatud = false;
    setLaen(true);
    setViga(false);
    const img = new Image();
    img.onload = () => {
      if (katkestatud) return;
      setKuvatud(src);
      setLaen(false);
      setVaade({ s: 1, x: 0, y: 0 });
    };
    img.onerror = () => {
      if (katkestatud) return;
      setKuvatud(src);
      setLaen(false);
      setViga(true);
    };
    img.src = src;
    return () => {
      katkestatud = true;
    };
  }, [src, kuvatud]);

  const piira = useCallback((v: { s: number; x: number; y: number }) => {
    const el = konteiner.current;
    const s = Math.min(MAX, Math.max(MIN, v.s));
    if (!el || s === 1) return { s, x: 0, y: 0 };
    // ei lase pilti konteinerist täiesti välja lohistada
    const w = el.clientWidth;
    const h = el.clientHeight;
    const x = Math.min(w * 0.5, Math.max(-w * (s - 0.5), v.x));
    const y = Math.min(h * 0.5, Math.max(-h * (s - 0.5), v.y));
    return { s, x, y };
  }, []);

  /** Suurendus punkti (cx, cy konteineri suhtes) ümber: punkt jääb paigale. */
  const suurendaPunktis = useCallback(
    (uusS: number, cx: number, cy: number) => {
      setVaade((v) => {
        const s = Math.min(MAX, Math.max(MIN, uusS));
        const k = s / v.s;
        return piira({ s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
    },
    [piira]
  );

  const kesk = () => {
    const el = konteiner.current;
    return el ? { cx: el.clientWidth / 2, cy: el.clientHeight / 2 } : { cx: 0, cy: 0 };
  };
  const suurenda = () => {
    const { cx, cy } = kesk();
    suurendaPunktis(vaade.s * 1.5, cx, cy);
  };
  const vahenda = () => {
    const { cx, cy } = kesk();
    suurendaPunktis(vaade.s / 1.5, cx, cy);
  };
  const mahuta = () => setVaade({ s: 1, x: 0, y: 0 });

  // Ctrl + hiireratas (passive: false, et lehe kerimist vältida)
  useEffect(() => {
    const el = konteiner.current;
    if (!el) return;
    function ratas(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el!.getBoundingClientRect();
      setVaade((v) => {
        const s = Math.min(MAX, Math.max(MIN, v.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        const k = s / v.s;
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        return piira({ s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
    }
    el.addEventListener("wheel", ratas, { passive: false });
    return () => el.removeEventListener("wheel", ratas);
  }, [piira]);

  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = konteiner.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    naputid.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (naputid.current.size === 2) {
      const [a, b] = [...naputid.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: vaade.s };
      lohistus.current = null;
    } else if (vaade.s > 1) {
      lohistus.current = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: vaade.x, vy: vaade.y };
    }
  }
  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (naputid.current.has(e.pointerId)) naputid.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && naputid.current.size === 2) {
      const [a, b] = [...naputid.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = konteiner.current!.getBoundingClientRect();
      const cx = (a.x + b.x) / 2 - r.left;
      const cy = (a.y + b.y) / 2 - r.top;
      suurendaPunktis(pinch.current.s * (dist / pinch.current.dist), cx, cy);
      return;
    }
    const l = lohistus.current;
    if (l && l.id === e.pointerId) {
      setVaade((v) => piira({ s: v.s, x: l.vx + (e.clientX - l.x), y: l.vy + (e.clientY - l.y) }));
    }
  }
  function pointerUp(e: React.PointerEvent<HTMLDivElement>) {
    naputid.current.delete(e.pointerId);
    if (naputid.current.size < 2) pinch.current = null;
    if (lohistus.current?.id === e.pointerId) lohistus.current = null;
  }
  function topeltklõps(e: React.MouseEvent<HTMLDivElement>) {
    const r = konteiner.current!.getBoundingClientRect();
    if (vaade.s > 1) mahuta();
    else suurendaPunktis(2, e.clientX - r.left, e.clientY - r.top);
  }
  function klahv(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      suurenda();
    } else if (e.key === "-") {
      e.preventDefault();
      vahenda();
    } else if (e.key === "0") {
      e.preventDefault();
      mahuta();
    } else if (vaade.s > 1 && ["ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const d = e.key === "ArrowUp" ? 40 : -40;
      setVaade((v) => piira({ ...v, y: v.y + d }));
    }
  }

  const nupp = "rounded border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40";
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
        <button type="button" onClick={vahenda} disabled={vaade.s <= MIN} className={nupp} aria-label="Vähenda">−</button>
        <span className="w-10 text-center tabular-nums">{Math.round(vaade.s * 100)} %</span>
        <button type="button" onClick={suurenda} disabled={vaade.s >= MAX} className={nupp} aria-label="Suurenda">+</button>
        <button type="button" onClick={mahuta} disabled={vaade.s === 1} className={nupp}>mahuta</button>
        {kirjeldus && <span className="ml-auto rounded bg-stone-100 px-1.5 py-0.5 text-stone-600">{kirjeldus}</span>}
      </div>
      <div
        ref={konteiner}
        tabIndex={0}
        role="img"
        aria-label={alt}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onDoubleClick={topeltklõps}
        onKeyDown={klahv}
        className={`relative h-[60vh] overflow-hidden rounded-md border border-stone-300 bg-stone-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 lg:h-[calc(100vh-16rem)] ${
          vaade.s > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
        style={{ touchAction: "none" }}
      >
        {viga ? (
          <p className="p-4 text-sm text-stone-600">Pilti ei õnnestunud laadida ({leht.pilt}).</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={kuvatud}
            alt={alt}
            draggable={false}
            className="mx-auto block h-full w-auto max-w-full select-none object-contain"
            style={{
              transform: `translate(${vaade.x}px, ${vaade.y}px) scale(${vaade.s})`,
              transformOrigin: "0 0",
              transition: lohistus.current ? "none" : "transform 80ms ease-out",
            }}
          />
        )}
        {laen && (
          <span className="absolute right-2 top-2 rounded bg-white/90 px-2 py-0.5 text-xs text-stone-600" aria-live="polite">
            Laen…
          </span>
        )}
      </div>
    </div>
  );
}
