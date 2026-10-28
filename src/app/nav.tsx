"use client";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "공고 확인" },
  { href: "/prepare", label: "출국 준비" },
  { href: "/trust", label: "믿을 수 있나요?" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="주 메뉴">
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}
