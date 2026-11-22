import { useEffect, useState } from 'react';
import './reservations-page.css';

type ReservationSection = {
  id: string;
  title: string;
  items: string[];
  notes: string[];
};
type ReservationsData = {
  intro: string;
  sections: ReservationSection[];
};
const base = import.meta.env.BASE_URL;

export default function ReservationsPage() {
  const [data, setData] = useState<ReservationsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(base + 'data/reservations.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('예약 정보를 불러오지 못했습니다.');
        return response.json() as Promise<ReservationsData>;
      })
      .then(setData)
      .catch(reason => {
        if (reason?.name !== 'AbortError') setError(String(reason));
      });
    return () => controller.abort();
  }, []);

  return <main className="wrap reservation-page">
    <a href="#/" className="back-link">← 전체 일정으로</a>
    <header className="reservation-header">
      <p className="overline">ITALIA · 준비 및 예약</p>
      <h1>예약 현황</h1>
      <p>예약 완료 항목과 앞으로 확인하거나 구매해야 할 항목을 구분했습니다.</p>
    </header>
    {error && <div className="reservation-fallback" role="alert">
      <p>{error}</p>
      <a href={base + 'legacy/reservations/'}>기존 예약 문서 열기 ↗</a>
    </div>}
    {!error && !data && <p className="reservation-fallback" role="status">예약 정보 불러오는 중…</p>}
    {data && <>
      <div className="reservation-intro" dangerouslySetInnerHTML={{ __html: data.intro }} />
      <nav className="reservation-tabs" aria-label="예약 현황 구역">
        {data.sections.map(section => <button key={section.id} type="button"
          onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          {section.title} <span>{section.items.length}</span>
        </button>)}
      </nav>
      {data.sections.map(section => <section key={section.id} className="reservation-section" id={section.id}>
        <header className="reservation-section-heading">
          <h2>{section.title}</h2>
          <span>{section.items.length}개 항목</span>
        </header>
        <ol className="reservation-items">
          {section.items.map((item, index) => <li key={index} className="reservation-item">
            <span className="reservation-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div className="reservation-item-content" dangerouslySetInnerHTML={{ __html: item }} />
          </li>)}
        </ol>
        {section.notes.map((note, index) =>
          <div key={index} className="reservation-note" dangerouslySetInnerHTML={{ __html: note }} />)}
      </section>)}
    </>}
  </main>;
}
