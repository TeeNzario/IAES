import { hashPassword } from '../../src/lib/password';

export const DEMO_PASSWORD = '1234';

export const FACULTY = {
  MANAGEMENT: 1,
  ACCOUNTING_FINANCE: 2,
  AGRI_FOOD: 3,
  LAW: 4,
  NURSING: 5,
  MEDICINE: 6,
  PHARMACY: 7,
  POLITICAL_SCIENCE: 8,
  SCIENCE: 11,
  ENGINEERING_TECH: 12,
  LIBERAL_ARTS: 13,
  EDUCATION: 14,
  PUBLIC_HEALTH: 17,
  INFORMATION_SCIENCE: 18,
} as const;

export const CURRICULUM = {
  TOURISM_DIGITAL: 'CUR001',
  LOGISTICS: 'CUR002',
  DIGITAL_MARKETING: 'CUR003',
  HOSPITALITY: 'CUR006',
  ACCOUNTING: 'CUR008',
  ECONOMICS: 'CUR009',
  LAW: 'CUR012',
  NURSING: 'CUR013',
  CHEMISTRY: 'CUR033',
  BIOLOGY: 'CUR034',
  COMPUTER_AI: 'CUR042',
  ELECTRICAL_ENG: 'CUR045',
  CIVIL_ENG: 'CUR046',
  CHINESE: 'CUR047',
  THAI_LANG: 'CUR048',
  ENGLISH: 'CUR049',
  MULTIMEDIA: 'CUR066',
  IT_DIGITAL_INNOVATION: 'CUR067',
  MEDICAL_INFO: 'CUR068',
  DIGITAL_COMM: 'CUR069',
} as const;

let cachedHash: string | null = null;

export async function getDemoPasswordHash(): Promise<string> {
  if (!cachedHash) {
    cachedHash = await hashPassword(DEMO_PASSWORD);
  }
  return cachedHash;
}
