export function useTreeModel ()  {
  const selectedTree = useState("selectedTree", ()=>null)

  return{
    selectedTree
  }
}
