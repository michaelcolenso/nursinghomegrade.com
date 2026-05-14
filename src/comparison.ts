// Comparison System State Management
export interface SavedFacility {
  cms_id: string;
  name: string;
  grade_letter: string;
  grade_score: number;
}

// Key for localStorage
export const STORAGE_KEY = "nhg_saved_facilities";

export function getSavedFacilities(): SavedFacility[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveFacility(facility: SavedFacility): void {
  const saved = getSavedFacilities();
  if (!saved.find((f) => f.cms_id === facility.cms_id)) {
    saved.push(facility);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
}

export function unsaveFacility(cms_id: string): void {
  const saved = getSavedFacilities().filter((f) => f.cms_id !== cms_id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

export function isFacilitySaved(cms_id: string): boolean {
  return getSavedFacilities().some((f) => f.cms_id === cms_id);
}
