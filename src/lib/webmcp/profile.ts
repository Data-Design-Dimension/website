/**
 * Static profile metadata used by user-action tools (getResume, sendEmail,
 * openLinkedInProfile, openGitHubProfile, shareProfile). Single source of
 * truth so agent payloads stay consistent with what the site shows
 * elsewhere.
 *
 * TODO: resume URL is a placeholder. Host the canonical PDF on
 * Cloudflare R2 (e.g., https://media.dadeda.design/Kathryn_Hurchla.pdf)
 * or in /public if comfortable committing the public version, then
 * update RESUME_URL.
 */
export const PROFILE = {
  name: 'Kathryn Hurchla',
  contactEmail: 'kathy.hurchla@fantasy.co',
  oneLiner:
    "Associate Principal Engineer at Fantasy. AI-first creative engineering and data visualization, where design and engineering blur.",
  siteUrl: 'https://dadeda.design',
  linkedInUrl: 'https://www.linkedin.com/in/kathrynhurchla/',
  gitHubUrl: 'https://github.com/khurchla',
  resumeUrl: '/resume/Kathryn_Hurchla.pdf', // TODO: host canonical version
} as const;
