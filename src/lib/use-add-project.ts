import { useProjectStore } from '../stores/project-store'
import { useModalStore } from '../stores/modal-store'

export function useAddProject() {
  const { addProject } = useProjectStore()
  const { openQuickStart } = useModalStore()

  const openFolder = async () => {
    const path = await window.electron.openFolderDialog()
    if (!path) return
    const { projects, setActiveProject } = useProjectStore.getState()
    const existing = projects.find((p) => p.path === path)
    if (existing) {
      setActiveProject(existing.id)
    } else {
      addProject(path)
    }
  }

  const cloneFromUrl = () => {}
  const quickStart = () => openQuickStart()

  return { openFolder, cloneFromUrl, quickStart }
}
