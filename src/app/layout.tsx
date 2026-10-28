import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "./nav";

export const metadata: Metadata = {
  title: "글로벌-인 · 출국 전 공고 안전 점검",
  description: "해외 취업·유학을 준비하는 청년을 위한 AI 공고 안전 점검과 출국 준비 체크리스트",
};

export const viewport: Viewport = { themeColor: "#16213b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="top">
          <div className="wrap">
            <a className="brand" href="/">
              글로벌-인 <small>출국 전 공고 안전 점검</small>
            </a>
            <Nav />
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot">
          <div className="wrap">
            <p>글로벌-인의 판단은 AI와 규칙이 만든 참고 정보이며, 사기 여부를 확정하지 않습니다. 최종 판단 전에 아래 공식 기관에 확인하세요.</p>
            <p>입력한 공고 글과 이미지는 분석에만 쓰이고 서버에 저장하지 않습니다. 2026 AI 라이프 솔루션 챌린지 출품 시제품입니다.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
