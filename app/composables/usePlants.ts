// composables/usePlants.ts
import { useNativeStorage } from './useNativeStorage'

export interface Plant {
  id: number | string
  name: string
  strain?: string
  stage?: string
  potSize?: string
  location?: string
  medium?: string
  plantingDate?: string
  photoPreview?: string
  createdAt: string
  health?: number
}

export const usePlants = () => {
  const plants = useState<Plant[]>('plants-list', () => [])

  const { setObject, getObject } = useNativeStorage()
  const STORAGE_KEY = 'my-trees-data'

  const loadPlantsFromStorage = async () => {
    try {
      const storedPlants = await getObject<Plant[]>(STORAGE_KEY)
      // Fresh installs start empty — no demo/sample plants.
      plants.value = storedPlants && storedPlants.length > 0 ? storedPlants : []
    } catch (e) {
      console.error('Error loading plants:', e)
    }
  }

  const saveToStorage = async () => {
    try {
      await setObject(STORAGE_KEY, plants.value)
    } catch (e) {
      console.error('Error saving plants:', e)
    }
  }

  const addPlant = async (plantData: Partial<Plant>) => {
    const newPlant: Plant = {
      id: Date.now(),
      name: plantData.name || 'Unnamed Plant',
      strain: plantData.strain || '',
      stage: plantData.stage || 'Seedling',
      potSize: plantData.potSize || '',
      location: plantData.location || 'indoor',
      medium: plantData.medium || 'soil',
      plantingDate: plantData.plantingDate || new Date().toISOString().split('T')[0],
      photoPreview: plantData.photoPreview || '',
      createdAt: new Date().toISOString(),
      ...plantData
    }

    plants.value.push(newPlant)
    await saveToStorage()
  }

  const updatePlant = async (updatedPlant: Plant) => {
    const index = plants.value.findIndex(p => String(p.id) === String(updatedPlant.id))
    if (index !== -1) {
      plants.value[index] = updatedPlant
      await saveToStorage()
    }
  }

  /**
   * Edit a plant by merging partial data into the existing plant object.
   * This is the function used by the plant detail edit modal.
   */
  const editPlant = async (id: number | string, data: Record<string, unknown>) => {
    const index = plants.value.findIndex(p => String(p.id) === String(id))
    const existing = plants.value[index]
    if (existing) {
      plants.value[index] = { ...existing, ...data } as Plant
      await saveToStorage()
    }
  }

  const removePlant = async (id: number | string) => {
    plants.value = plants.value.filter(p => String(p.id) !== String(id))
    await saveToStorage()
  }

  /**
   * Alias for removePlant – used by the plant detail page.
   */
  const deletePlant = async (id: number | string) => {
    await removePlant(id)
  }

  return {
    plants,
    loadPlantsFromStorage,
    addPlant,
    updatePlant,
    editPlant,
    removePlant,
    deletePlant
  }
}
