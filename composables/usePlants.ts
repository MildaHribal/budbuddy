import { ref } from 'vue';

const STORAGE_KEY = 'plants';

const plants = ref<Array<any>>([]);

function loadPlantsFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    console.log("[usePlants] Raw storage data:", raw); // Přidáno
    const arr = JSON.parse(raw);
    console.log("[usePlants] Parsed storage data:", arr); // Přidáno
    if (Array.isArray(arr)) plants.value = arr; else plants.value = [];
  } catch (e) {
    plants.value = [];
    console.error('usePlants: failed to parse storage', e);
  }
}

function savePlantsToStorage() {
  if (typeof window === 'undefined') return;
  try {
    // Debug: if saving empty array, print stack to find caller
    if (Array.isArray(plants.value) && plants.value.length === 0) {
      console.warn('[usePlants] saving empty plants array to storage — stack trace:');
      try { console.trace(); } catch (e) { console.warn('trace not available'); }
    }
    console.log("[usePlants] Saving plants to storage:", plants.value); // Přidáno
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants.value));
  } catch (e) {
    console.error('usePlants: failed to save to storage', e);
  }
}

function addPlant(p: any) {
  console.log('[usePlants] addPlant', p && p.id);
  plants.value.push(p);
  savePlantsToStorage();
}

function editPlant(plantId: string, updatedPlant: any) {
  console.log('[usePlants] editPlant called for ID:', plantId, 'with data:', updatedPlant); // Přidáno
  const index = plants.value.findIndex(p => String(p.id) === String(plantId)); // Zajištění string porovnání
  console.log('[usePlants] editPlant - found index:', index); // Přidáno
  if (index !== -1) {
    plants.value[index] = { ...plants.value[index], ...updatedPlant };
    console.log('[usePlants] Plants after edit:', plants.value); // Přidáno
    savePlantsToStorage();
  } else {
    console.warn(`[usePlants] Plant with ID ${plantId} not found for editing.`);
  }
}

function deletePlant(plantId: string) {
  console.log('[usePlants] deletePlant called for ID:', plantId); // Přidáno
  const initialLength = plants.value.length;
  plants.value = plants.value.filter(p => String(p.id) !== String(plantId)); // Zajištění string porovnání
  console.log('[usePlants] Plants after delete:', plants.value); // Přidáno
  if (plants.value.length < initialLength) {
    savePlantsToStorage();
  } else {
    console.warn(`[usePlants] Plant with ID ${plantId} not found for deletion.`);
  }
}

function clearPlants() {
  console.warn('[usePlants] clearPlants called — clearing all plants');
  plants.value = [];
  savePlantsToStorage();
}

if (typeof window !== 'undefined') {
  loadPlantsFromStorage();
}

export function usePlants() {
  return {
    plants,
    loadPlantsFromStorage,
    savePlantsToStorage,
    addPlant,
    editPlant,
    deletePlant,
    clearPlants,
  };
}
