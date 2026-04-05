import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import { X } from '@phosphor-icons/react'
import { useEditorStore } from '../../stores/editor-store'
import { useActiveProject } from '../../stores/project-store'

const EMPTY_FILES: string[] = []

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
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
  return map[ext] ?? 'plaintext'
}

function getModelUri(path: string): monaco.Uri {
  return monaco.Uri.file(path)
}

function getOrCreateModel(path: string, content: string): monaco.editor.ITextModel {
  const uri = getModelUri(path)
  const existing = monaco.editor.getModel(uri)
  if (existing) return existing
  return monaco.editor.createModel(content, getLanguage(path), uri)
}

export function EditorPanel() {
  const project = useActiveProject()
  const { closeFile, setActiveFile, setFileContent } = useEditorStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const changeListenerRef = useRef<monaco.IDisposable | null>(null)

  const projectId = project?.id ?? ''
  const openFiles = useEditorStore((s) => s.openFiles[projectId] ?? EMPTY_FILES)
  const activeFile = useEditorStore((s) => s.activeFile[projectId] ?? null)
  const fileContents = useEditorStore((s) => s.fileContents)

  // Create editor once
  useEffect(() => {
    if (!containerRef.current) return

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

    const editor = monaco.editor.create(containerRef.current, {
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

    return () => {
      changeListenerRef.current?.dispose()
      editor.dispose()
      editorRef.current = null
    }
  }, [])

  // Switch model when active file changes
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !activeFile) return

    const content = fileContents[activeFile] ?? ''
    const model = getOrCreateModel(activeFile, content)

    // Only switch if different model
    if (editor.getModel() !== model) {
      editor.setModel(model)
    }

    // Re-register change listener for the active file
    changeListenerRef.current?.dispose()
    changeListenerRef.current = model.onDidChangeContent(() => {
      setFileContent(activeFile, model.getValue())
    })
  }, [activeFile, fileContents, setFileContent])

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900">
        <p className="text-zinc-600 text-sm">No project selected</p>
      </div>
    )
  }

  if (openFiles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900">
        <p className="text-zinc-600 text-sm">Select a file to open</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Tab bar */}
      <div className="flex items-center bg-zinc-950 border-b border-zinc-800 overflow-x-auto shrink-0 scrollbar-none">
        {openFiles.map((path) => {
          const name = path.split('/').pop() ?? path
          const isActive = path === activeFile
          return (
            <div
              key={path}
              onClick={() => setActiveFile(projectId, path)}
              title={path}
              className={`
                group flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer select-none shrink-0
                border-r border-zinc-800 transition-colors
                ${isActive
                  ? 'bg-zinc-900 text-zinc-200 border-b border-b-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}
              `}
            >
              <span className="max-w-[140px] truncate">{name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeFile(projectId, path)
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-zinc-100 transition-opacity ml-0.5"
              >
                <X size={10} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Monaco editor */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  )
}
