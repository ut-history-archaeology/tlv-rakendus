import type { ReactNode } from "react";

/** PA-10: link Rahvusarhiivi püsilingile; url puudumisel lihtsalt tekst. */
export default function ArhiiviLink({ url, children }: { url: string | null; children: ReactNode }) {
  if (!url) return <>{children}</>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 underline decoration-blue-300 hover:decoration-blue-700"
      title="Ava Rahvusarhiivis (avaneb uues aknas)"
    >
      {children}
    </a>
  );
}
