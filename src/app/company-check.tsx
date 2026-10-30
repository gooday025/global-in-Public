"use client";
import { useMemo, useState } from "react";
import { companyLinks, findClues } from "@/lib/company";

type Row = { tone: "ok" | "warn" | "bad" | "none"; label: string; value: string; hint?: string };

const MARK = { ok: "✓", warn: "!", bad: "!", none: "–" } as const;

export function CompanyCheck({ text, aiCompany, iso2, country }: { text: string; aiCompany?: string | null; iso2?: string | null; country?: string | null }) {
  const clues = useMemo(() => findClues(text, aiCompany), [text, aiCompany]);
  const [name, setName] = useState(clues.name);
  const [copied, setCopied] = useState(false);
  const corpDomains = clues.emails.filter((e) => !e.free).map((e) => e.domain);
  const links = companyLinks(name, iso2, clues.sites.length ? clues.sites : corpDomains);

  const rows: Row[] = [];
  rows.push(
    clues.name
      ? { tone: "ok", label: "회사명", value: clues.name }
      : { tone: "bad", label: "회사명", value: "공고에 없음", hint: "회사명을 밝히지 않으면 확인할 방법이 없어요. 정식 법인명부터 물어보세요." },
  );
  const free = clues.emails.find((e) => e.free);
  const corp = clues.emails.find((e) => !e.free);
  if (corp) rows.push({ tone: "ok", label: "연락 메일", value: corp.address, hint: "회사 도메인 메일이에요. 아래에서 도메인을 만든 날짜도 확인해 보세요." });
  if (free) rows.push({ tone: "warn", label: "연락 메일", value: free.address, hint: `무료 메일(${free.domain})이에요. 정상 회사는 대개 회사 도메인 메일로 채용해요.` });
  if (!clues.emails.length) rows.push({ tone: "none", label: "연락 메일", value: "공고에 없음", hint: "회사 공식 메일이 있는지 물어보세요." });
  if (clues.sites.length) rows.push({ tone: clues.domainMismatch ? "warn" : "ok", label: "웹사이트", value: clues.sites.join(", "), hint: clues.domainMismatch ? "메일 주소와 웹사이트 도메인이 서로 달라요. 같은 회사가 맞는지 확인해 보세요." : undefined });
  else rows.push({ tone: "none", label: "웹사이트", value: "공고에 없음", hint: "회사 홈페이지 주소를 물어보세요." });

  async function copy() {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="card company" id="company">
      <h3>회사가 진짜인지 확인하기</h3>
      <p className="company-lede">공고에서 찾은 단서예요. 아래 버튼으로 공식 등록부와 검색 결과를 바로 열 수 있어요.</p>
      <ul className="clue-list">
        {rows.map((r, i) => (
          <li key={i} className={r.tone}>
            <span className="clue-mk" aria-hidden="true">
              {MARK[r.tone]}
            </span>
            <div>
              <p>
                <b>{r.label}</b> <span>{r.value}</span>
              </p>
              {r.hint ? <small>{r.hint}</small> : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="company-name">
        <label htmlFor="cname">{clues.name ? "확인할 회사명" : "회사명을 알게 되면 입력하세요"}</label>
        <div className="company-input">
          <input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: Daon Electronics Vietnam Co., Ltd." autoComplete="off" />
          <button type="button" className="btn ghost" onClick={copy} disabled={!name.trim()}>
            {copied ? "복사했어요" : "복사"}
          </button>
        </div>
        {country ? <small>근무 국가: {country}</small> : null}
      </div>

      <ol className="check-links">
        {links.map((l) => {
          const off = l.needsName && !name.trim();
          return (
            <li key={l.key}>
              <a
                className={off ? "off" : ""}
                href={off ? undefined : l.href}
                target="_blank"
                rel="noreferrer"
                aria-disabled={off}
                onClick={() => {
                  if (l.copyName && name.trim()) copy();
                }}
              >
                <span>
                  <b>{l.title}</b>
                  <small>{off ? "회사명을 입력하면 열 수 있어요" : l.copyName && name.trim() ? `${l.desc} · 누르면 회사명이 복사돼요` : l.desc}</small>
                </span>
                <i aria-hidden="true">↗</i>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="muted">
        등록된 회사여도 이름만 도용한 사기일 수 있어요. 공고에 적힌 연락처가 아니라, 회사 공식 사이트에 나온 연락처로 직접 채용 여부를 물어보세요.
      </p>
    </div>
  );
}
