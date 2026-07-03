import { getInstituteByCode, isSpecializedTestCode, isSpecializedTestInstitute, type Institute } from './institutes';

export const VALID_PROFILE_YEARS = ['1st', '2nd', '3rd', '4th', '5th'];

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

  if (!isSpecializedTest && !VALID_PROFILE_YEARS.includes(profile.year)) {
    return { complete: false, reason: 'missing_year', selectedInstitute, isSpecializedTest };
  }

  return { complete: true, reason: 'complete', selectedInstitute, isSpecializedTest };
}
