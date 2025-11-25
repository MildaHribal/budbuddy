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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants.value));
  } catch (e) {
    console.error('usePlants: failed to save to storage', e);
  }
}

function addPlant(p: any) {
  plants.value.push(p);
  savePlantsToStorage();
}

function clearPlants() {
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

