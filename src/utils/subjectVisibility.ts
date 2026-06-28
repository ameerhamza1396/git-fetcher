export interface InstituteScopedSubject {
  institutes?: string[] | null;
}

export const isSubjectVisibleForInstitute = <T extends InstituteScopedSubject>(
  subject: T,
  institute?: string | null,
): boolean => {
  const institutes = subject.institutes;

  if (!institutes || !Array.isArray(institutes) || institutes.length === 0) {
    return true;
  }

  const normalized = institutes.map(item => String(item).toLowerCase());
  if (normalized.includes('all')) {
    return true;
  }

  if (!institute) {
    return false;
  }

  return normalized.includes(String(institute).toLowerCase());
};

export const filterSubjectsForInstitute = <T extends InstituteScopedSubject>(
  subjects: T[],
  institute?: string | null,
): T[] => subjects.filter(subject => isSubjectVisibleForInstitute(subject, institute));
