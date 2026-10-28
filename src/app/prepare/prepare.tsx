"use client";
import { useEffect, useState } from "react";
import { COUNTRIES, PURPOSES, type Group } from "@/lib/checklist";
import type { TravelAlert } from "@/lib/travel";

function plusDays(n: number) {
  const d = new Date(Date.now() + n * 864e5);
  return d.toISOString().slice(0, 10);
}

function whenLabel(d: number) {
  if (d > 0) return `출국 ${d}일 전`;
  if (d === 0) return "출국 당일";
  return "도착 후 한 달 안에";
}

export function Prepare() {
  const [purpose, setPurpose] = useState("job");
  const [country, setCountry] = useState("JP");
  const [depart, setDepart] = useState("");
  useEffect(() => {
    setDepart((d) => d || plusDays(75));
  }, []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<{ groups: Group[]; travel: TravelAlert; country: string; aiUsed: boolean } | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function make() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose, country, depart }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
      setDone({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "체크리스트를 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="form">
        <label>
          목적
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {PURPOSES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label>
          국가
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.iso} value={c.iso}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          출국 예정일
          <input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} />
        </label>
        <button className="btn" type="button" onClick={make} disabled={busy}>
          {busy ? "만드는 중…" : "체크리스트 만들기"}
        </button>
      </div>
      {err ? <p className="err" role="alert">{err}</p> : null}

      {data ? (
        <>
          <p className="hint" style={{ marginTop: 20 }}>
            {data.country} · {PURPOSES.find((p) => p.id === purpose)?.label} · 출국 {depart}
            {data.aiUsed ? " · 'AI 제안' 항목은 국가·목적에 맞춰 AI가 덧붙인 것으로, 공식 사이트에서 다시 확인하세요." : ""}
          </p>
          {data.travel?.source === "api" && data.travel.levelName ? (
            <div className={`travel ${data.travel.level && data.travel.level >= 3 ? "warn" : ""}`} style={{ marginTop: 12 }}>
              {data.travel.countryName} 여행경보: <strong>{data.travel.levelName}</strong>
              {data.travel.special ? " · 특별여행주의보" : ""}
            </div>
          ) : null}
          <ol className="timeline">
            {data.groups.map((g) => (
              <li key={g.dday}>
                <div className="when">
                  {whenLabel(g.dday)}
                  <span>{g.dday >= 0 ? g.date + "까지" : ""}</span>
                </div>
                <ul>
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <input
                        type="checkbox"
                        id={it.id}
                        checked={!!done[it.id]}
                        onChange={(e) => setDone({ ...done, [it.id]: e.target.checked })}
                      />
                      <label htmlFor={it.id}>
                        {it.risky ? <strong>[사기 예방] </strong> : null}
                        {it.text}
                        <span className="item-src">
                          {it.url ? (
                            <a href={it.url} target="_blank" rel="noreferrer">{it.source}</a>
                          ) : (
                            it.source
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <button className="btn ghost noprint" type="button" onClick={() => window.print()}>
            인쇄하거나 PDF로 저장
          </button>
        </>
      ) : null}
    </>
  );
}
