import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "./nav";

const TITLE = "글로벌-인 · 해외 구인 공고 안전 점검";
const DESC = "그 해외 공고, 지원하기 전에 1분만 확인하세요. 공고 글·링크·캡처를 넣으면 해외취업 사기 위험 신호를 원문에 표시해 드려요.";

export const metadata: Metadata = {
  metadataBase: new URL("https://global-in-public.vercel.app"),
  title: TITLE,
  description: DESC,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "글로벌-인",
    title: TITLE,
    description: DESC,
    images: [{ url: "/og.png", width: 1200, height: 600, alt: "글로벌-인 해외 구인 공고 안전 점검" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="top">
          <div className="wrap">
            <a className="brand" href="/" aria-label="글로벌-인 처음으로">
              <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
                <path d="M10 16.5l4 4 8-9" fill="none" stroke="var(--stop)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              글로벌-인
            </a>
            <Nav />
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot">
          <div className="wrap foot-grid">
            <div>
              <p className="foot-brand">글로벌-인</p>
              <p>판단 결과는 참고 정보이며 사기 여부를 확정하지 않습니다. 넣은 글과 이미지는 분석에만 쓰고 저장하지 않습니다.</p>
              <p>2026 AI 라이프 솔루션 챌린지 출품 시제품 · DGIST 차건희·정다혜</p>
            </div>
            <div>
              <p className="foot-h">위급할 때</p>
              <p>
                영사안전콜센터(24시간) <a href="tel:+82232100404">+82-2-3210-0404</a>
              </p>
              <p>
                경찰 <a href="tel:112">112</a>
              </p>
            </div>
            <div>
              <p className="foot-h">더 알아보기</p>
              <p>
                <a href="/trust">판단 근거와 정확도</a>
              </p>
              <p>
                <a href="https://github.com/gooday025/global-in-Public" target="_blank" rel="noreferrer">
                  소스 코드(GitHub)
                </a>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
