/**
 * Centralized curriculum configuration.
 *
 * This is the single source of truth for curriculum data across the frontend.
 * Use this for dropdowns, display labels, and ID → name mappings.
 *
 * To add or update a curriculum, simply edit this array.
 * IDs must match the `curriculum_id` values stored in the database.
 */
export interface Curriculum {
  id: number;
  name: string;
}

export const CURRICULUMS: Curriculum[] = [
  { id: 1, name: 'Computer Science' },
  { id: 2, name: 'Information Technology' },
  // Add more curriculums here as needed
];

/**
 * Look up a curriculum by its numeric ID.
 * Returns `undefined` if not found.
 *
 * @example
 * getCurriculumById(1) // → { id: 1, name: 'Computer Science' }
 */
export function getCurriculumById(id: number | null | undefined): Curriculum | undefined {
  if (id == null) return undefined;
  return CURRICULUMS.find((c) => c.id === id);
}

/**
 * Get the display name for a curriculum ID.
 * Returns a fallback string if the ID is not found.
 *
 * @example
 * getCurriculumName(1)         // → 'Computer Science'
 * getCurriculumName(null)      // → '-'
 * getCurriculumName(99)        // → 'Unknown (99)'
 */
export function getCurriculumName(id: number | null | undefined, fallback = '-'): string {
  if (id == null) return fallback;
  const curriculum = getCurriculumById(id);
  return curriculum ? curriculum.name : `Unknown (${id})`;
}
