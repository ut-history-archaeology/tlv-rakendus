"use client";

/**
 * Ekspordi-utiliidid (EX-01…EX-08).
 * CSV: UTF-8 BOM + semikoolon; metaandmed #-kommentaaridena.
 * JSON: metaandmed eraldi võtmes. XLSX: exceljs (dünaamiline import).
 * Read on lamedad objektid (serialiseeritavad server→klient piiril).
 */

export interface EkspordiMeta {
  /** Failinime kirjeldav osa, nt "tlv-isikud-koosseis-1921-1923" */
  failinimi: string;
  /** Aktiivsed filtrid inimloetaval kujul */
  filtrid: Record<string, string>;
}

export interface EkspordiVeerg {
  key: string;
  pealkiri: string;
}

export type EkspordiRida = Record<string, string | number | null>;

const ALLIKAS = "Tartu Linnavolikogu andmestik, 2026";

function tanaISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function laeAlla(sisu: Blob, failinimi: string) {
  const url = URL.createObjectURL(sisu);
  const a = document.createElement("a");
  a.href = url;
  a.download = failinimi;
  a.click();
  URL.revokeObjectURL(url);
}

function csvValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function metaRead(meta: EkspordiMeta, ridu: number): string[] {
  const read = [
    `# Allikas: ${ALLIKAS}`,
    `# Eksporditud: ${new Date().toISOString()}`,
    `# URL: ${typeof window !== "undefined" ? window.location.href : ""}`,
    `# Ridade arv: ${ridu}`,
  ];
  for (const [k, v] of Object.entries(meta.filtrid)) {
    read.push(`# Filter — ${k}: ${v}`);
  }
  return read;
}

export function ekspordiCSV(
  read: EkspordiRida[],
  veerud: EkspordiVeerg[],
  meta: EkspordiMeta
) {
  const rid: string[] = [
    ...metaRead(meta, read.length),
    veerud.map((v) => csvValue(v.pealkiri)).join(";"),
    ...read.map((r) => veerud.map((v) => csvValue(r[v.key])).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + rid.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  laeAlla(blob, `${meta.failinimi}-${tanaISO()}.csv`);
}

export function ekspordiJSON(
  read: EkspordiRida[],
  veerud: EkspordiVeerg[],
  meta: EkspordiMeta
) {
  const objektid = read.map((r) =>
    Object.fromEntries(veerud.map((v) => [v.key, r[v.key] ?? null]))
  );
  const sisu = {
    meta: {
      allikas: ALLIKAS,
      eksporditud: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "",
      filtrid: meta.filtrid,
      ridade_arv: read.length,
    },
    andmed: objektid,
  };
  const blob = new Blob([JSON.stringify(sisu, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  laeAlla(blob, `${meta.failinimi}-${tanaISO()}.json`);
}

export async function ekspordiXLSX(
  read: EkspordiRida[],
  veerud: EkspordiVeerg[],
  meta: EkspordiMeta
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = ALLIKAS;
  const ws = wb.addWorksheet("Andmed", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = veerud.map((v) => ({ header: v.pealkiri, key: v.key }));
  for (const r of read) {
    ws.addRow(Object.fromEntries(veerud.map((v) => [v.key, r[v.key] ?? ""])));
  }
  // Arial + automaatne veerulaius (EX-03)
  ws.eachRow((row) => {
    row.font = { name: "Arial", size: 10 };
  });
  ws.getRow(1).font = { name: "Arial", size: 10, bold: true };
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 60);
  });
  const buf = await wb.xlsx.writeBuffer();
  laeAlla(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${meta.failinimi}-${tanaISO()}.xlsx`
  );
}
