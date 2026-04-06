import { useState, useEffect, useRef } from 'react'
import { X, File, Lightning } from '@phosphor-icons/react'
import { useModalStore } from '../../stores/modal-store'
import { useProjectStore } from '../../stores/project-store'

const TEMPLATES = [
  {
    id: 'empty',
    name: 'Empty',
    description: 'Start from scratch',
    icon: <File size={28} weight="light" />,
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'TS, Tailwind, App Router',
    icon: (
      <span className="text-xl font-bold font-mono leading-none">N</span>
    ),
  },
]

export function QuickStartModal() {
  const { closeQuickStart } = useModalStore()
  const { addProject } = useProjectStore()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [template, setTemplate] = useState('empty')
  const [creating, setCreating] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.electron.getHomePath().then((home) => setLocation(`${home}/Projects`))
    setTimeout(() => {
      nameRef.current?.focus()
      nameRef.current?.select()
    }, 50)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQuickStart()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeQuickStart])

  const handleBrowse = async () => {
    const folder = await window.electron.openFolderDialog()
    if (folder) setLocation(folder)
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    const trimmedLocation = location.trim()
    if (!trimmedName || !trimmedLocation || creating) return
    setCreating(true)
    try {
      const projectPath = `${trimmedLocation}/${trimmedName}`
      await window.electron.mkdir(projectPath)
      addProject(projectPath)
      closeQuickStart()
    } catch (e) {
      console.error('Failed to create project:', e)
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeQuickStart() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-panel border border-edge rounded-xl shadow-2xl w-[480px] flex flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-t1">Quick start</h2>
            <p className="text-xs text-t3 mt-0.5">Create a new project folder on your machine</p>
          </div>
          <button
            onClick={closeQuickStart}
            className="no-drag text-t3 hover:text-t1 p-1 rounded hover:bg-overlay transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-t2">Name</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-project"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            className="selectable w-full rounded-lg px-3 py-2 text-sm text-t1 placeholder:text-t4 outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-t2">Location</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="selectable flex-1 rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={handleBrowse}
              className="no-drag px-3 py-2 text-xs text-t2 hover:text-t1 rounded-lg hover:bg-overlay transition-colors shrink-0"
            >
              Browse…
            </button>
          </div>
        </div>

        {/* Template */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-t2">Template</label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`no-drag flex flex-col items-center gap-2.5 p-4 rounded-lg border transition-all text-center ${
                  template === t.id
                    ? 'border-accent bg-accent-10 text-t1'
                    : 'border-edge text-t2 hover:text-t1 hover:bg-overlay transition-colors'
                }`}
              >
                <div className="text-t3">{t.icon}</div>
                <div>
                  <div className="text-[13px] font-medium text-t1">{t.name}</div>
                  <div className="text-[11px] text-t3 mt-0.5">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="no-drag flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Lightning size={14} weight="fill" />
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
