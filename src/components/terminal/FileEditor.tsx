import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import { useEditorStore } from '../../stores/editor-store'

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  json: 'json', jsonc: 'json',
  css: 'css', scss: 'scss', less: 'less',
  html: 'html', htm: 'html',
  md: 'markdown', mdx: 'markdown',
  py: 'python', rb: 'ruby', go: 'go',
  rs: 'rust', java: 'java', cpp: 'cpp', c: 'c',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  yaml: 'yaml', yml: 'yaml', toml: 'toml',
  xml: 'xml', sql: 'sql', graphql: 'graphql',
  swift: 'swift', kt: 'kotlin',
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return LANG_MAP[ext] ?? 'plaintext'
}

function getOrCreateModel(path: string, content: string): monaco.editor.ITextModel {
  const uri = monaco.Uri.file(path)
  const existing = monaco.editor.getModel(uri)
  if (existing) return existing
  return monaco.editor.createModel(content, getLanguage(path), uri)
}

let themeRegistered = false

interface FileEditorProps {
  filePath: string
  active: boolean
}

export function FileEditor({ filePath, active }: FileEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { setFileContent } = useEditorStore()

  // Create editor with model in a single effect
  useEffect(() => {
    if (!containerRef.current) return

    if (!themeRegistered) {
      themeRegistered = true
      monaco.editor.defineTheme('glyph-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#09090b',
          'editor.foreground': '#e4e4e7',
          'editorLineNumber.foreground': '#52525b',
          'editorLineNumber.activeForeground': '#a1a1aa',
          'editor.lineHighlightBackground': '#18181b',
          'editor.selectionBackground': '#3f3f4680',
          'editorCursor.foreground': '#ffffff',
          'editor.inactiveSelectionBackground': '#3f3f4640',
          'editorIndentGuide.background1': '#27272a',
          'editorIndentGuide.activeBackground1': '#3f3f46',
          'scrollbar.shadow': '#00000000',
          'scrollbarSlider.background': '#3f3f4680',
          'scrollbarSlider.hoverBackground': '#52525b80',
          'scrollbarSlider.activeBackground': '#71717a80',
        },
      })
    }

    const content = useEditorStore.getState().fileContents[filePath] ?? ''
    const model = getOrCreateModel(filePath, content)

    const editor = monaco.editor.create(containerRef.current, {
      model,
      theme: 'glyph-dark',
      fontSize: 13,
      fontFamily: '"JetBrains Mono", monospace',
      fontLigatures: true,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      cursorStyle: 'line',
      cursorBlinking: 'blink',
      smoothScrolling: true,
      padding: { top: 12, bottom: 12 },
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      automaticLayout: true,
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
      },
    })

    editorRef.current = editor

    const listener = model.onDidChangeContent(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setFileContent(filePath, model.getValue())
      }, 300)
    })

    return () => {
      listener.dispose()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      editor.dispose()
      editorRef.current = null
    }
  }, [filePath, setFileContent])

  // Focus when becoming active
  useEffect(() => {
    if (active) editorRef.current?.focus()
  }, [active])

  return <div ref={containerRef} className="w-full h-full" />
}
