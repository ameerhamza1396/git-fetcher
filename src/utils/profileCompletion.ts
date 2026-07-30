import { getInstituteByCode, isSpecializedTestCode, isSpecializedTestInstitute, type Institute } from './institutes';

export const VALID_PROFILE_YEARS = ['1st', '2nd', '3rd', '4th', '5th'];

export const getInstituteYearOptions = (institute?: Pick<Institute, 'years'> | null): string[] => (
  Array.isArray(institute?.years)
    ? institute.years.map(item => String(item).trim()).filter(Boolean)
    : []
);

export type ProfileCompletionReason =
  | 'missing_profile'
  | 'missing_username'
  | 'missing_institute'
  | 'unknown_institute'
  | 'missing_year'
  | 'complete';

export type ProfileCompletionResult = {
  complete: boolean;
  reason: ProfileCompletionReason;
  selectedInstitute?: Institute;
  isSpecializedTest: boolean;
};

export function getProfileCompletion(
  profile: any,
  institutes: Institute[] = [],
): ProfileCompletionResult {
  if (!profile) {
    return { complete: false, reason: 'missing_profile', isSpecializedTest: false };
  }

  const username = String(profile.username || '').trim();
  if (!username) {
    return { complete: false, reason: 'missing_username', isSpecializedTest: false };
  }

  const instituteCode = String(profile.institute || '').trim();
  if (!instituteCode) {
    return { complete: false, reason: 'missing_institute', isSpecializedTest: false };
  }

  const selectedInstitute = getInstituteByCode(instituteCode, institutes);
  const isSpecializedTest =
    isSpecializedTestInstitute(selectedInstitute) ||
    isSpecializedTestCode(instituteCode);

  if (!selectedInstitute && !isSpecializedTest) {
    return { complete: false, reason: 'unknown_institute', isSpecializedTest: false };
  }

  const yearOptions = getInstituteYearOptions(selectedInstitute);
  if (yearOptions.length > 0 && !yearOptions.includes(String(profile.year || '').trim())) {
    return { complete: false, reason: 'missing_year', selectedInstitute, isSpecializedTest };
  }

  return { complete: true, reason: 'complete', selectedInstitute, isSpecializedTest };
}
