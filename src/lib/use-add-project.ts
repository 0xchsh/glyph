import { useProjectStore } from '../stores/project-store'

export function useAddProject() {
  const { addProject } = useProjectStore()

  const openFolder = async () => {
    const path = await window.electron.openFolderDialog()
    if (path) addProject(path)
  }

  // Placeholders — wired up when those features are built
  const cloneFromUrl = () => {}
  const quickStart = () => {}

  return { openFolder, cloneFromUrl, quickStart }
}
