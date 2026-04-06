import { FolderOpen, Globe, Lightning } from '@phosphor-icons/react'
import { useAddProject } from '../../lib/use-add-project'

export function StartScreen() {
  const { openFolder, cloneFromUrl, quickStart } = useAddProject()

  return (
    <div className="flex-1 flex flex-col bg-base">
      {/* Invisible drag handle at the top */}
      <div className="drag-region h-10 w-full shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        {/* Wordmark */}
        <h1 className="text-5xl font-normal text-t1 tracking-tight" style={{ fontFamily: "'Open Runde', sans-serif" }}>
          glyph
        </h1>

        {/* Action cards */}
        <div className="flex gap-4">
          <ActionCard
            icon={<FolderOpen size={32} weight="light" />}
            title="Open project"
            description="Browse for an existing folder"
            onClick={openFolder}
          />
          <ActionCard
            icon={<Globe size={32} weight="light" />}
            title="Clone from URL"
            description="Paste a Git URL to clone"
            onClick={cloneFromUrl}
          />
          <ActionCard
            icon={<Lightning size={32} weight="light" />}
            title="Quick start"
            description="Scaffold a new project"
            onClick={quickStart}
          />
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col items-center gap-3 p-7 w-44
        rounded-lg border border-edge bg-panel
        text-t2 hover:text-t1 hover:border-edge-60 hover:bg-overlay-60
        transition-all duration-150 cursor-pointer
      "
    >
      <div className="text-t3">{icon}</div>
      <div className="text-center">
        <div className="text-[13px] font-medium text-t1">{title}</div>
        <div className="text-[12px] text-t3 mt-0.5">{description}</div>
      </div>
    </button>
  )
}
