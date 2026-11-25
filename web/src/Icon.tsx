// Small inline stroke icons (no external icon font or CDN).
const paths: Record<string, string> = {
  check: 'M5 12.5l4.2 4.2L19 7',
  recheck: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  weather: 'M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 10.5 3.75 3.75 0 0 0 7 18z',
  tentative: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 7v5l3 2',
  review: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M20.5 20.5L16 16',
  booking: 'M4 8a2 2 0 0 0 0 4v5h16v-5a2 2 0 0 0 0-4V5H4z M14 5v12',
  waiting: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9',
  train: 'M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2z M5 10h14 M8 21l2-4 M16 21l-2-4 M9 14h.01 M15 14h.01',
  car: 'M5 16V11l2-5h10l2 5v5 M3 16h18v3H3z M7.5 13h.01 M16.5 13h.01 M5 11h14',
  taxi: 'M5 16V11l2-5h10l2 5v5 M3 16h18v3H3z M10 3h4v3h-4z M5 11h14',
  plane: 'M10.5 21l1.5-6-6.5 3.5L4 17l7-6V5a1.5 1.5 0 0 1 3 0v6l7 6-1.5 1.5L13 15l1.5 6',
  bed: 'M3 19V6 M3 15h18v4 M21 15v-3a3 3 0 0 0-3-3h-7v6 M7 12.5a1.5 1.5 0 1 0 0-.01',
  walk: 'M13 4.5a1.5 1.5 0 1 0 0-.01 M9 21l2.5-7 2.5 2.5V21 M8 12l2-4.5 3 .5 2 3.5 3 1 M11.5 14L10 8',
  food: 'M7 3v8a2 2 0 0 0 2 2v8 M5 3v6 M9 3v6 M17 21V3c-2 1-3 4-3 8h3',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14',
  calendar: 'M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5',
  ticket: 'M4 8a2 2 0 0 0 0 4v5h16v-5a2 2 0 0 0 0-4V5H4z M14 5v12',
  list: 'M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  home: 'M4 11l8-7 8 7 M6 9.5V20h12V9.5 M10 20v-5h4v5',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  down: 'M12 5v14 M6 13l6 6 6-6',
  doc: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 13h7 M9 17h7',
  sparkle: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5L18 18 M6 18l2.5-2.5 M15.5 8.5L18 6',
};

export type IconName = keyof typeof paths;

export default function Icon({ name, size = 18, className }: {name: string; size?: number; className?: string}) {
  const d = paths[name] ?? paths.pin;
  return <svg className={'icon' + (className ? ' ' + className : '')} width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>;
}
