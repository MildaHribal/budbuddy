export function useTreeModel() {
  const selectedTree = useState<string | null>('selectedTree', () => null)

  return {
    selectedTree
  }
}
