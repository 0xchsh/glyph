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
        <h1
          className="text-6xl font-normal text-t1 animate-fade-up"
          style={{ fontFamily: "'Jacquarda Bastarda 9', serif" }}
        >
          glyph
        </h1>

        {/* Action cards */}
        <div className="flex gap-4">
          {[
            { icon: <FolderOpen size={20} />, title: 'Open project', description: 'Choose an existing folder', action: openFolder },
            { icon: <Globe size={20} />, title: 'Clone from URL', description: 'Paste a Git URL to clone', action: cloneFromUrl },
            { icon: <Lightning size={20} />, title: 'Quick start', description: 'Scaffold a new project', action: quickStart },
          ].map((card, i) => (
            <ActionCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              description={card.description}
              onClick={card.action}
              delay={80 + i * 60}
            />
          ))}
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
  delay = 0,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  delay?: number
}) {
  return (
    <button
      onClick={onClick}
      className="
        animate-fade-up
        flex flex-col justify-between p-4 w-44 h-32
        rounded-lg border border-edge bg-panel
        text-t2 hover:text-t1 hover:border-edge-60 hover:bg-overlay-60
        hover:-translate-y-0.5
        transition-all duration-150 cursor-pointer
      "
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-t3">{icon}</div>
      <div className="text-left">
        <div className="text-[13px] font-medium text-t1">{title}</div>
        <div className="text-[11px] text-t3 mt-0.5">{description}</div>
      </div>
    </button>
  )
}
