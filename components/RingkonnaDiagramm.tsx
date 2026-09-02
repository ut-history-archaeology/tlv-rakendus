"use client";

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export interface RingkonnaAndmed {
  ringkond: string;
  haali: number;
  valituid: number;
}

/** KS-07: 1939. aasta valimiste hääled ringkondade kaupa. */
export default function RingkonnaDiagramm({ andmed }: { andmed: RingkonnaAndmed[] }) {
  return (
    <div>
      <div className="h-64 w-full" aria-hidden>
        <ResponsiveContainer>
          <BarChart data={andmed} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="ringkond" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number) => [`${v} häält`, "Hääli kokku"]}
              labelFormatter={(l) => `Ringkond ${l}`}
            />
            <Bar dataKey="haali" fill="#dc2626" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>1939. aasta valimiste hääled ringkondade kaupa</caption>
        <thead>
          <tr><th>Ringkond</th><th>Hääli kokku</th><th>Valituid</th></tr>
        </thead>
        <tbody>
          {andmed.map((r) => (
            <tr key={r.ringkond}>
              <td>{r.ringkond}</td><td>{r.haali}</td><td>{r.valituid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
