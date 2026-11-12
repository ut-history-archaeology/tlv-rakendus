import { Fragment } from "react";
import { arhiiviLingid } from "@/lib/viited";

/** PA-10: arhiiviviited lingina Rahvusarhiivi püsilingile (iga viide lahtris eraldi). */
export default function ArhiiviViited({ tekst, eraldaja = ", " }: { tekst: string; eraldaja?: string }) {
  const lingid = arhiiviLingid(tekst);
  if (lingid.length === 0) return null;
  return (
    <>
      {lingid.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && eraldaja}
          {l.url ? (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline decoration-blue-300 hover:decoration-blue-700"
              title="Ava Rahvusarhiivis (avaneb uues aknas)"
            >
              {l.tekst}
            </a>
          ) : (
            l.tekst
          )}
        </Fragment>
      ))}
    </>
  );
}
