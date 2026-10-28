"use client";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "공고 확인" },
  { href: "/prepare", label: "출국 준비" },
  { href: "/how", label: "판단 방법" },
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
