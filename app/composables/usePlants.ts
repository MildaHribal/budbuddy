// composables/usePlants.ts
import { useNativeStorage } from './useNativeStorage';
import { usePlantJournal } from './usePlantJournal';

export interface Plant {
  id: number | string;
  name: string;
  strain?: string;
  stage?: string;
  potSize?: string;
  location?: string;
  medium?: string;
  plantingDate?: string;
  photoPreview?: string;
  createdAt: string;
  health?: number;
}

export const usePlants = () => {
  const plants = useState<Plant[]>('plants-list', () => []);

  const { setObject, getObject } = useNativeStorage();
  const STORAGE_KEY = 'my-trees-data';

  const loadPlantsFromStorage = async () => {
    try {
      const storedPlants = await getObject<Plant[]>(STORAGE_KEY);
      if (storedPlants && storedPlants.length > 0) {
        plants.value = storedPlants;
      } else {
        await seedInitialData();
      }
    } catch (e) {
      console.error('Error loading plants:', e);
    }
  };

  const saveToStorage = async () => {
    try {
      await setObject(STORAGE_KEY, plants.value);
    } catch (e) {
      console.error('Error saving plants:', e);
    }
  };

  const seedInitialData = async () => {
    const today = new Date();
    const subDays = (d: number) => (new Date(today.getTime() - d * 86400000).toISOString().split('T')[0]) as string;

    const demoPlants: Plant[] = [
      {
        id: 1,
        name: 'Northern Lights #1',
        strain: 'Northern Lights',
        stage: 'Flowering',
        potSize: '5 gal',
        location: 'indoor',
        medium: 'soil',
        plantingDate: subDays(45),
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Sour Diesel Clone',
        strain: 'Sour Diesel',
        stage: 'Vegetative',
        potSize: '3 gal',
        location: 'indoor',
        medium: 'coco',
        plantingDate: subDays(20),
        createdAt: new Date().toISOString(),
      }
    ];

    plants.value = demoPlants;
    await saveToStorage();

    // Create journal entries for Plant 1
    const p1Journal = usePlantJournal(1);
    await p1Journal.addEntry({ date: subDays(42), type: 'note', note: 'Seed sprouted!' });
    await p1Journal.addEntry({ date: subDays(30), type: 'nutrients', amount: '2ml/L Grow' });
    await p1Journal.addEntry({ date: subDays(15), type: 'water', amount: '1L' });
    await p1Journal.addEntry({ date: subDays(5), type: 'note', note: 'Switched to 12/12 light cycle.' });

    // Create journal entries for Plant 2
    const p2Journal = usePlantJournal(2);
    await p2Journal.addEntry({ date: subDays(18), type: 'note', note: 'Clone rooted and transplanted.' });
    await p2Journal.addEntry({ date: subDays(10), type: 'water', amount: '500ml' });
    await p2Journal.addEntry({ date: subDays(2), type: 'nutrients', amount: '1ml/L Grow' });
  };

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

  /**
   * Edit a plant by merging partial data into the existing plant object.
   * This is the function used by the plant detail edit modal.
   */
  const editPlant = async (id: number | string, data: Record<string, unknown>) => {
    const index = plants.value.findIndex(p => String(p.id) === String(id));
    const existing = plants.value[index];
    if (existing) {
      plants.value[index] = { ...existing, ...data } as Plant;
      await saveToStorage();
    }
  };

  const removePlant = async (id: number | string) => {
    plants.value = plants.value.filter(p => String(p.id) !== String(id));
    await saveToStorage();
  };

  /**
   * Alias for removePlant – used by the plant detail page.
   */
  const deletePlant = async (id: number | string) => {
    await removePlant(id);
  };

  return {
    plants,
    loadPlantsFromStorage,
    addPlant,
    updatePlant,
    editPlant,
    removePlant,
    deletePlant
  };
};
