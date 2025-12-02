import { ref } from 'vue';

const STORAGE_KEY = 'plants';

const plants = ref<Array<any>>([]);

function loadPlantsFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    const arr = JSON.parse(raw);
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
    clearPlants,
  };
}
