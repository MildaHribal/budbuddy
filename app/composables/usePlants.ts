// composables/usePlants.ts
import { useNativeStorage } from './useNativeStorage';

export interface Plant {
  id: number | string;
  name: string;
  strain?: string;
  photoPreview?: string;
  createdAt: string;
}

export const usePlants = () => {
  const plants = useState<Plant[]>('plants-list', () => []);

  const { setObject, getObject } = useNativeStorage();
  const STORAGE_KEY = 'my-trees-data';

  const loadPlantsFromStorage = async () => {
    try {
      const storedPlants = await getObject<Plant[]>(STORAGE_KEY);
      if (storedPlants) {
        plants.value = storedPlants;
      }
    } catch (e) {
      console.error('Chyba při načítání rostlin:', e);
    }
  };

  const saveToStorage = async () => {
    try {
      await setObject(STORAGE_KEY, plants.value);
    } catch (e) {
      console.error('Chyba při ukládání:', e);
    }
  };

  const addPlant = async (plantData: Partial<Plant>) => {
    const newPlant: Plant = {
      id: Date.now(),
      name: plantData.name || 'Unnamed Plant',
      strain: plantData.strain || '',
      photoPreview: plantData.photoPreview || '',
      createdAt: new Date().toISOString(),
      ...plantData
    };

    plants.value.push(newPlant);

    await saveToStorage();
  };

  const updatePlant = async (updatedPlant: Plant) => {
    const index = plants.value.findIndex(p => String(p.id) === String(updatedPlant.id));
    if (index !== -1) {
      plants.value[index] = updatedPlant;
      await saveToStorage();
    }
  };

  const removePlant = async (id: number | string) => {
    plants.value = plants.value.filter(p => String(p.id) !== String(id));
    await saveToStorage();
  };

  return {
    plants,
    loadPlantsFromStorage,
    addPlant,
    updatePlant,
    removePlant
  };
};
