export default {
  version: 1,
  groups: [
    {
      id: 'fcps1-common-question-bank',
      enabled: true,
      sourceSubject: {
        name: 'April 2026',
        instituteCode: 'fcps_part_1',
      },
      targets: {
        mode: 'all_subjects_for_institute',
        instituteCode: 'fcps_part_1',
      },
      includeInSubjectPractice: true,
      chapters: [
        { name: 'Question Bank - Medicine', sortOrder: 9 },
        { name: 'Question Bank - Surgery', sortOrder: 10 },
        { name: 'Question Bank - Radiology', sortOrder: 11 },
        { name: 'Question Bank - Gynecology', sortOrder: 12 },
      ],
    },
  ],
};
