/**
 * Static profile metadata used by user-action tools (getResume, sendEmail,
 * openLinkedInProfile, openGitHubProfile, shareProfile). Single source of
 * truth so agent payloads stay consistent with what the site shows
 * elsewhere.
 */
export const PROFILE = {
  name: 'Kathryn Hurchla',
  contactEmail: 'kathryn@dadeda.design',
  oneLiner:
    "Associate Principal Engineer at Fantasy. AI-first creative engineering and data visualization, where design and engineering blur.",
  siteUrl: 'https://dadeda.design',
  linkedInUrl: 'https://www.linkedin.com/in/kathrynhurchla/',
  gitHubUrl: 'https://github.com/khurchla',
  resumeUrl: '/Kathryn_Hurchla_resume.pdf',
} as const;
