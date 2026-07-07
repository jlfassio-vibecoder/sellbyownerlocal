export type AccentColor = {
  label: string;
  value: string;
  hex: string;
  tailwindText: string;
  tailwindBg: string;
  tailwindBorder: string;
  tailwindSoftBg: string;
  tailwindSoftBorder: string;
};

export const ACCENT_COLORS = [
  {
    label: 'Red',
    value: 'red',
    hex: '#dc2626',
    tailwindText: 'text-red-600',
    tailwindBg: 'bg-red-600',
    tailwindBorder: 'border-red-600',
    tailwindSoftBg: 'bg-red-50',
    tailwindSoftBorder: 'border-red-100',
  },
  {
    label: 'Blue',
    value: 'blue',
    hex: '#2563eb',
    tailwindText: 'text-blue-600',
    tailwindBg: 'bg-blue-600',
    tailwindBorder: 'border-blue-600',
    tailwindSoftBg: 'bg-blue-50',
    tailwindSoftBorder: 'border-blue-100',
  },
  {
    label: 'Green',
    value: 'green',
    hex: '#16a34a',
    tailwindText: 'text-green-600',
    tailwindBg: 'bg-green-600',
    tailwindBorder: 'border-green-600',
    tailwindSoftBg: 'bg-green-50',
    tailwindSoftBorder: 'border-green-100',
  },
  {
    label: 'Yellow',
    value: 'yellow',
    hex: '#d97706',
    tailwindText: 'text-amber-600',
    tailwindBg: 'bg-amber-500',
    tailwindBorder: 'border-amber-500',
    tailwindSoftBg: 'bg-amber-50',
    tailwindSoftBorder: 'border-amber-100',
  },
  {
    label: 'Orange',
    value: 'orange',
    hex: '#ea580c',
    tailwindText: 'text-orange-600',
    tailwindBg: 'bg-orange-600',
    tailwindBorder: 'border-orange-600',
    tailwindSoftBg: 'bg-orange-50',
    tailwindSoftBorder: 'border-orange-100',
  },
  {
    label: 'Brown',
    value: 'brown',
    hex: '#92400e',
    tailwindText: 'text-amber-800',
    tailwindBg: 'bg-amber-800',
    tailwindBorder: 'border-amber-800',
    tailwindSoftBg: 'bg-amber-50',
    tailwindSoftBorder: 'border-amber-200',
  },
  {
    label: 'Black',
    value: 'black',
    hex: '#0f172a',
    tailwindText: 'text-slate-900',
    tailwindBg: 'bg-slate-900',
    tailwindBorder: 'border-slate-900',
    tailwindSoftBg: 'bg-slate-50',
    tailwindSoftBorder: 'border-slate-200',
  },
  {
    label: 'Silver',
    value: 'silver',
    hex: '#475569',
    tailwindText: 'text-slate-600',
    tailwindBg: 'bg-slate-600',
    tailwindBorder: 'border-slate-600',
    tailwindSoftBg: 'bg-slate-50',
    tailwindSoftBorder: 'border-slate-200',
  },
  {
    label: 'Fire Red',
    value: 'fire-red',
    hex: '#b91c1c',
    tailwindText: 'text-red-700',
    tailwindBg: 'bg-red-700',
    tailwindBorder: 'border-red-700',
    tailwindSoftBg: 'bg-red-50',
    tailwindSoftBorder: 'border-red-100',
  },
  {
    label: 'Pearl White',
    value: 'pearl-white',
    hex: '#f8fafc',
    tailwindText: 'text-slate-700',
    tailwindBg: 'bg-slate-200',
    tailwindBorder: 'border-slate-300',
    tailwindSoftBg: 'bg-slate-50',
    tailwindSoftBorder: 'border-slate-200',
  },
  {
    label: 'Alpine Green',
    value: 'alpine-green',
    hex: '#166534',
    tailwindText: 'text-green-700',
    tailwindBg: 'bg-green-700',
    tailwindBorder: 'border-green-700',
    tailwindSoftBg: 'bg-green-50',
    tailwindSoftBorder: 'border-green-100',
  },
  {
    label: 'Midnight Blue',
    value: 'midnight-blue',
    hex: '#1e3a8a',
    tailwindText: 'text-blue-800',
    tailwindBg: 'bg-blue-800',
    tailwindBorder: 'border-blue-800',
    tailwindSoftBg: 'bg-blue-50',
    tailwindSoftBorder: 'border-blue-100',
  },
  {
    label: 'Burgundy',
    value: 'burgundy',
    hex: '#881337',
    tailwindText: 'text-rose-800',
    tailwindBg: 'bg-rose-800',
    tailwindBorder: 'border-rose-800',
    tailwindSoftBg: 'bg-rose-50',
    tailwindSoftBorder: 'border-rose-100',
  },
] as const satisfies readonly AccentColor[];

export const ACCENT_COLOR_VALUES = ACCENT_COLORS.map((c) => c.value) as [
  (typeof ACCENT_COLORS)[number]['value'],
  ...(typeof ACCENT_COLORS)[number]['value'][],
];

export type AccentColorValue = (typeof ACCENT_COLOR_VALUES)[number];

export const DEFAULT_ACCENT_COLOR: AccentColorValue = 'red';

const accentByValue = new Map<string, AccentColor>(
  ACCENT_COLORS.map((color) => [color.value, color])
);

export function getAccent(colorValue?: string): AccentColor {
  if (colorValue) {
    const match = accentByValue.get(colorValue);
    if (match) return match;
  }
  return accentByValue.get(DEFAULT_ACCENT_COLOR)!;
}
