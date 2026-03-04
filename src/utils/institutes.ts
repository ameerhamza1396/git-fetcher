// Institute configuration
export interface Institute {
  id: string;
  name: string;
  shortName: string;
  image: string;
  enabled: boolean;
  years: string[]; // which years this institute supports
}

export const INSTITUTES: Institute[] = [
  {
    id: 'dmc',
    name: 'Dow Medical College Karachi',
    shortName: 'DMC',
    image: '/images/institutes/dmc.png',
    enabled: true,
    years: ['1st', '2nd', '3rd', '4th', '5th'],
  },
  {
    id: 'smbb',
    name: 'Shaheed Muhtarma Benazir Bhutto Medical College Karachi',
    shortName: 'SMBB',
    image: '/images/institutes/smbb.png',
    enabled: true,
    years: ['1st', '2nd', '3rd', '4th', '5th'],
  },
  {
    id: 'duhs',
    name: 'Dow University of Health Sciences',
    shortName: 'DUHS',
    image: '/images/institutes/duhs.png',
    enabled: true,
    years: ['1st', '2nd', '3rd', '4th', '5th'],
  },
  {
    id: 'kemc',
    name: 'King Edward Medical College Lahore',
    shortName: 'KEMC',
    image: '/images/institutes/kemc.png',
    enabled: false,
    years: ['1st', '2nd', '3rd', '4th', '5th'],
  },
  {
    id: 'uhs',
    name: 'University of Health Sciences Punjab',
    shortName: 'UHS',
    image: '/images/institutes/uhs.png',
    enabled: false,
    years: ['1st', '2nd', '3rd', '4th', '5th'],
  },
  {
    id: 'qamc',
    name: 'Quaid e Azam Medical University Rahim Yar Khan',
    shortName: 'QAMC',
    image: '/images/institutes/qamc.png',
    enabled: false,
    years: ['1st', '2nd', '3rd', '4th', '5th'],
  },
];

// Subject-to-institute mapping (subjects can belong to multiple institutes)
export const SUBJECT_INSTITUTE_MAP: Record<string, string[]> = {
  // Example mappings - these should be updated based on actual subject IDs
  anatomy: ['dmc', 'smbb', 'duhs'],
  physiology: ['dmc', 'smbb', 'duhs'],
  biochemistry: ['dmc', 'smbb', 'duhs'],
  pharmacology: ['dmc', 'smbb', 'duhs'],
  pathology: ['dmc', 'smbb', 'duhs'],
  forensic_medicine: ['dmc', 'smbb', 'duhs'],
  community_medicine: ['dmc', 'smbb', 'duhs'],
  medicine: ['dmc', 'smbb', 'duhs'],
  surgery: ['dmc', 'smbb', 'duhs'],
  gynecology: ['dmc', 'smbb', 'duhs'],
  pediatrics: ['dmc', 'smbb', 'duhs'],
  ophthalmology: ['dmc', 'smbb', 'duhs'],
  ent: ['dmc', 'smbb', 'duhs'],
  radiology: ['dmc', 'smbb', 'duhs'],
  psychiatry: ['dmc', 'smbb', 'duhs'],
};

export function getInstituteById(id: string): Institute | undefined {
  return INSTITUTES.find(i => i.id === id);
}

export function getEnabledInstitutes(): Institute[] {
  return INSTITUTES.filter(i => i.enabled);
}

export function getAllInstitutes(): Institute[] {
  return INSTITUTES;
}
