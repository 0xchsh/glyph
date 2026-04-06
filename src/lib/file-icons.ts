import {
  File,
  FileCode,
  FileCss,
  FileHtml,
  FileJs,
  FileTs,
  FileTsx,
  FileImage,
  FileText,
  FileZip,
  FilePdf,
  FileRs,
  FileSql,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

export interface FileIconConfig {
  icon: Icon
  color: string
}

const EXT_MAP: Record<string, FileIconConfig> = {
  // TypeScript
  ts:    { icon: FileTs,   color: '#3b82f6' }, // blue-500
  tsx:   { icon: FileTsx,  color: '#3b82f6' },
  // JavaScript
  js:    { icon: FileJs,   color: '#eab308' }, // yellow-500
  jsx:   { icon: FileJs,   color: '#eab308' },
  mjs:   { icon: FileJs,   color: '#eab308' },
  cjs:   { icon: FileJs,   color: '#eab308' },
  // Styles
  css:   { icon: FileCss,  color: '#38bdf8' }, // sky-400
  scss:  { icon: FileCss,  color: '#f472b6' }, // pink-400
  sass:  { icon: FileCss,  color: '#f472b6' },
  less:  { icon: FileCss,  color: '#60a5fa' }, // blue-400
  // Markup
  html:  { icon: FileHtml, color: '#f97316' }, // orange-500
  htm:   { icon: FileHtml, color: '#f97316' },
  xml:   { icon: FileCode, color: '#fb923c' }, // orange-400
  svg:   { icon: FileCode, color: '#a78bfa' }, // violet-400
  // Data / config
  json:  { icon: FileCode, color: '#fbbf24' }, // amber-400
  jsonc: { icon: FileCode, color: '#fbbf24' },
  yaml:  { icon: FileCode, color: '#a78bfa' },
  yml:   { icon: FileCode, color: '#a78bfa' },
  toml:  { icon: FileCode, color: '#f97316' },
  env:   { icon: FileCode, color: '#4ade80' }, // green-400
  // Docs
  md:    { icon: FileText, color: '#94a3b8' }, // slate-400
  mdx:   { icon: FileText, color: '#94a3b8' },
  txt:   { icon: FileText, color: '#94a3b8' },
  // Code — languages
  py:    { icon: FileCode, color: '#3b82f6' },
  rs:    { icon: FileRs,   color: '#f97316' },
  go:    { icon: FileCode, color: '#38bdf8' }, // sky-400
  rb:    { icon: FileCode, color: '#ef4444' }, // red-500
  php:   { icon: FileCode, color: '#a78bfa' },
  java:  { icon: FileCode, color: '#f97316' },
  kt:    { icon: FileCode, color: '#a78bfa' },
  swift: { icon: FileCode, color: '#f97316' },
  c:     { icon: FileCode, color: '#3b82f6' },
  cpp:   { icon: FileCode, color: '#3b82f6' },
  cc:    { icon: FileCode, color: '#3b82f6' },
  h:     { icon: FileCode, color: '#94a3b8' },
  hpp:   { icon: FileCode, color: '#94a3b8' },
  cs:    { icon: FileCode, color: '#a78bfa' },
  sh:    { icon: FileCode, color: '#4ade80' },
  bash:  { icon: FileCode, color: '#4ade80' },
  zsh:   { icon: FileCode, color: '#4ade80' },
  fish:  { icon: FileCode, color: '#4ade80' },
  sql:   { icon: FileSql,  color: '#f59e0b' }, // amber-500
  // Images
  png:   { icon: FileImage, color: '#34d399' }, // emerald-400
  jpg:   { icon: FileImage, color: '#34d399' },
  jpeg:  { icon: FileImage, color: '#34d399' },
  gif:   { icon: FileImage, color: '#34d399' },
  webp:  { icon: FileImage, color: '#34d399' },
  ico:   { icon: FileImage, color: '#34d399' },
  // Archives
  zip:   { icon: FileZip, color: '#fbbf24' },
  tar:   { icon: FileZip, color: '#fbbf24' },
  gz:    { icon: FileZip, color: '#fbbf24' },
  // Documents
  pdf:   { icon: FilePdf, color: '#ef4444' },
}

export function getFileIcon(filename: string): FileIconConfig {
  const dotIdx = filename.lastIndexOf('.')
  const ext = dotIdx >= 0 ? filename.slice(dotIdx + 1).toLowerCase() : ''
  return EXT_MAP[ext] ?? { icon: File, color: '#71717a' } // zinc-500 fallback
}
