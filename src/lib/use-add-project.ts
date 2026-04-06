import { useProjectStore } from '../stores/project-store'

export function useAddProject() {
  const { addProject } = useProjectStore()

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

  // Placeholders — wired up when those features are built
  const cloneFromUrl = () => {}
  const quickStart = () => {}

  return { openFolder, cloneFromUrl, quickStart }
}
