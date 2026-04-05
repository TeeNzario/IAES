/**
 * Course name display helpers.
 *
 * DB stores:
 *   course_name_th — Thai name (primary)
 *   course_name_en — English name
 *   course_name    — mirrors course_name_th for backward compatibility
 *                    (all legacy UI code reads this field)
 */

export interface CourseNames {
  course_name?: string | null;
  course_name_th?: string | null;
  course_name_en?: string | null;
}

/** Return Thai name if available, fall back to legacy course_name. */
export function getThaiCourseName(c: CourseNames): string {
  return c.course_name_th || c.course_name || '';
}

/** Return English name, fall back gracefully. */
export function getEnglishCourseName(c: CourseNames): string {
  return c.course_name_en || '';
}

/**
 * Combined display string: "Thai (English)" or just "Thai" if EN missing,
 * or just the legacy name if neither new field exists.
 */
export function formatCourseName(c: CourseNames): string {
  const th = getThaiCourseName(c);
  const en = getEnglishCourseName(c);

  if (en && th) return `${th} (${en})`;
  if (th) return th;
  if (en) return en;
  return '';
}
