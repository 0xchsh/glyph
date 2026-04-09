import { useState, useEffect, useRef } from 'react'
import { X, GitBranch } from '@phosphor-icons/react'
import { useModalStore } from '../../stores/modal-store'
import { useProjectStore } from '../../stores/project-store'

export function CloneModal() {
  const { closeClone } = useModalStore()
  const { addProject } = useProjectStore()
  const [url, setUrl] = useState('')
  const [location, setLocation] = useState('')
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.electron.getHomePath().then((home) => setLocation(`${home}/Projects`))
    setTimeout(() => urlRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeClone()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeClone])

  const handleBrowse = async () => {
    const folder = await window.electron.openFolderDialog()
    if (folder) setLocation(folder)
  }

  // Derive folder name from git URL (e.g. "my-repo" from "https://github.com/user/my-repo.git")
  const repoName = url.trim().replace(/\/+$/, '').replace(/\.git$/, '').split('/').pop() ?? ''

  const handleClone = async () => {
    const trimmedUrl = url.trim()
    const trimmedLocation = location.trim()
    if (!trimmedUrl || !trimmedLocation || !repoName || cloning) return
    setCloning(true)
    setError(null)
    try {
      const dest = `${trimmedLocation}/${repoName}`
      await window.electron.gitClone(trimmedUrl, dest)
      addProject(dest)
      closeClone()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('already exists') ? 'Folder already exists' : 'Clone failed — check the URL and try again')
      setCloning(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeClone() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      <div role="dialog" aria-label="Clone from URL" aria-modal="true" className="relative bg-panel border border-edge rounded-xl shadow-2xl w-[480px] flex flex-col gap-5 p-6 animate-scale-in">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-t1">Clone from URL</h2>
            <p className="text-xs text-t3 mt-0.5">Paste a Git repository URL to clone</p>
          </div>
          <button
            onClick={closeClone}
            aria-label="Close"
            className="no-drag text-t3 hover:text-t1 p-1 rounded hover:bg-overlay transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-t2">Repository URL</label>
          <input
            ref={urlRef}
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null) }}
            placeholder="https://github.com/user/repo.git"
            onKeyDown={(e) => { if (e.key === 'Enter') handleClone() }}
            className="selectable w-full rounded-lg px-3 py-2 text-sm text-t1 placeholder:text-t4 outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-t2">Clone to</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="selectable flex-1 rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={handleBrowse}
              className="no-drag px-3 py-2 text-xs text-t2 hover:text-t1 bg-overlay border border-edge rounded-lg hover:bg-overlay-60 transition-colors shrink-0"
            >
              Browse…
            </button>
          </div>
          {repoName && (
            <p className="text-[11px] text-t3 mt-0.5">Will clone into <span className="text-t2">{location}/{repoName}</span></p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleClone}
            disabled={!url.trim() || !repoName || cloning}
            className="no-drag flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <GitBranch size={14} weight="bold" />
            {cloning ? 'Cloning…' : 'Clone'}
          </button>
        </div>
      </div>
    </div>
  )
}
