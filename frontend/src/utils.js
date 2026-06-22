const PILL_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-indigo-100 text-indigo-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
];

export function categoryColor(name) {
  const idx = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % PILL_COLORS.length;
  return PILL_COLORS[idx];
}
