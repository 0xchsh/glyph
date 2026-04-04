/** Project accent palette — 8 warm muted tones */
export const PROJECT_COLORS = [
  'hsl(160, 50%, 45%)', // Teal
  'hsl(15, 70%, 55%)',  // Coral
  'hsl(35, 80%, 55%)',  // Amber
  'hsl(260, 45%, 60%)', // Violet
  'hsl(200, 60%, 55%)', // Sky
  'hsl(340, 50%, 55%)', // Rose
  'hsl(90, 50%, 50%)',  // Lime
  'hsl(210, 15%, 55%)', // Slate
] as const

export function assignColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

/** 1–2 letter monogram for a project name */
export function monogram(name: string): string {
  const parts = name.replace(/[-_.]/g, ' ').split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name[0] ?? '?').toUpperCase()
}
