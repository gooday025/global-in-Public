import { Checker } from "./checker";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>그 해외 구인 공고, 출국 전에 한 번 더 읽어 드릴게요.</h1>
        <p className="lede">
          공고 글이나 캡처를 넣으면 AI가 사기·감금으로 이어진 공고들의 공통 신호를 찾아 원문에 표시하고, 지원 전에 무엇을 확인해야 하는지 알려 줍니다.
        </p>
      </section>
      <Checker />
    </>
  );
}
