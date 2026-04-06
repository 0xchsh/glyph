export const PALETTES = {
  zinc:    { label: 'Zinc',    hex: '#71717a', rgb: '113 113 122' },
  rose:    { label: 'Rose',    hex: '#f43f5e', rgb: '244 63 94' },
  orange:  { label: 'Orange',  hex: '#f97316', rgb: '249 115 22' },
  amber:   { label: 'Amber',   hex: '#f59e0b', rgb: '245 158 11' },
  emerald: { label: 'Emerald', hex: '#10b981', rgb: '16 185 129' },
  sky:     { label: 'Sky',     hex: '#0ea5e9', rgb: '14 165 233' },
  violet:  { label: 'Violet',  hex: '#8b5cf6', rgb: '139 92 246' },
  pink:    { label: 'Pink',    hex: '#ec4899', rgb: '236 72 153' },
} as const

export type PaletteKey = keyof typeof PALETTES
export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[]

export function getPaletteHex(key: PaletteKey): string {
  return PALETTES[key].hex
}

export function getPaletteRgb(key: PaletteKey): string {
  return PALETTES[key].rgb
}
