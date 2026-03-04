// Institute configuration
export interface Institute {
  id: string;
  name: string;
  shortName: string;
  image: string;
  enabled: boolean;
  years: string[];
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
    id: 'ojha',
    name: 'Dow University of Health Sciences, Ojha Campus',
    shortName: 'OJHA',
    image: '/images/institutes/ojha.png',
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

// Map institute ID to full display name
export const INSTITUTE_DISPLAY_NAMES: Record<string, string> = {};
INSTITUTES.forEach(inst => {
  INSTITUTE_DISPLAY_NAMES[inst.id] = inst.name;
});

export function getInstituteById(id: string): Institute | undefined {
  return INSTITUTES.find(i => i.id === id);
}

export function getInstituteDisplayName(id: string): string {
  return INSTITUTE_DISPLAY_NAMES[id] || id;
}

export function getEnabledInstitutes(): Institute[] {
  return INSTITUTES.filter(i => i.enabled);
}

export function getAllInstitutes(): Institute[] {
  return INSTITUTES;
}
