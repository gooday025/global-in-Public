import { Prepare } from "./prepare";

export default function Page() {
  return (
    <section className="page">
      <h1>출국 준비 체크리스트</h1>
      <p className="lede">
        목적과 국가, 출국일을 고르면 날짜별로 할 일을 정리해 드립니다. 사기 예방에 꼭 필요한 항목은 따로 표시하고, 링크는 공식 기관 사이트만 연결합니다.
      </p>
      <Prepare />
    </section>
  );
}
