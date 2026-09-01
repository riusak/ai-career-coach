'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  Profile,
  ProfileCertification,
  ProfileEducation,
  ProfileExperience,
  ProfileSkill,
} from '@/types/profile';
import {
  createCertificationAction,
  createEducationAction,
  createExperienceAction,
  createSkillAction,
  deleteCertificationAction,
  deleteEducationAction,
  deleteExperienceAction,
  deleteSkillAction,
  updateProfileAction,
  type ProfileFormState,
  type SectionActionResult,
} from './actions';

interface ProfileFormProps {
  initialProfile: Profile | null;
  educations: ProfileEducation[];
  experiences: ProfileExperience[];
  skills: ProfileSkill[];
  certifications: ProfileCertification[];
}

const INITIAL_SECTION_STATE: SectionActionResult = { error: null };

const inputClasses =
  'mt-1 block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50';

const selectClasses = inputClasses;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-base font-semibold text-navy-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy-900">
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitRow({
  label,
  pending,
}: {
  label: string;
  pending: boolean;
}) {
  return (
    <div className="flex justify-end">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? `${label}…` : label}
      </button>
    </div>
  );
}

type FormAction = (formData: FormData) => Promise<void>;

function bindAction(
  fn: (prev: SectionActionResult, formData: FormData) => Promise<SectionActionResult>
): FormAction {
  return fn.bind(null, INITIAL_SECTION_STATE) as unknown as FormAction;
}

export default function ProfileForm({
  initialProfile,
  educations,
  experiences,
  skills,
  certifications,
}: ProfileFormProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tSkill = useTranslations('profile');

  const initialProfileState: ProfileFormState = {
    success: false,
    message: null,
    data: initialProfile,
  };
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initialProfileState
  );

  const [eduState, eduAction, eduPending] = useActionState(createEducationAction, INITIAL_SECTION_STATE);
  const [expState, expAction, expPending] = useActionState(createExperienceAction, INITIAL_SECTION_STATE);
  const [skillState, skillAction, skillPending] = useActionState(createSkillAction, INITIAL_SECTION_STATE);
  const [certState, certAction, certPending] = useActionState(createCertificationAction, INITIAL_SECTION_STATE);

  // Bound action variants for delete forms (revalidatePath handles refresh).
  const eduDeleteBound = bindAction(deleteEducationAction);
  const expDeleteBound = bindAction(deleteExperienceAction);
  const skillDeleteBound = bindAction(deleteSkillAction);
  const certDeleteBound = bindAction(deleteCertificationAction);

  return (
    <div className="space-y-8">
      {profileState.message && (
        <div
          role={profileState.success ? 'status' : 'alert'}
          className={`rounded-lg border p-4 text-sm ${
            profileState.success
              ? 'border-orange-200 bg-orange-50 text-orange-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {profileState.message.startsWith('profile.')
            ? t(profileState.message.slice('profile.'.length) as 'saveSuccess')
            : profileState.message}
        </div>
      )}

      {/* Identity */}
      <Section title={t('sectionIdentity')}>
        <form action={profileAction} className="space-y-4">
          <Field id="fullName" label={t('fullName')}>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={initialProfile?.full_name ?? ''}
              disabled={profilePending}
              className={inputClasses}
            />
          </Field>
          <Field id="headline" label={t('headline')}>
            <input
              id="headline"
              name="headline"
              type="text"
              defaultValue={initialProfile?.headline ?? ''}
              placeholder={t('headlinePlaceholder')}
              disabled={profilePending}
              className={inputClasses}
            />
          </Field>
          <Field id="bio" label={t('bio')}>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={initialProfile?.bio ?? ''}
              placeholder={t('bioPlaceholder')}
              disabled={profilePending}
              className={inputClasses}
            />
          </Field>
          <SubmitRow label={tCommon('save')} pending={profilePending} />
        </form>
      </Section>

      {/* Contact */}
      <Section title={t('sectionContact')}>
        <form action={profileAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="phone" label={t('phone')}>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={initialProfile?.phone ?? ''}
                placeholder={t('phonePlaceholder')}
                disabled={profilePending}
                className={inputClasses}
              />
            </Field>
            <Field id="location" label={t('location')}>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={initialProfile?.location ?? ''}
                placeholder={t('locationPlaceholder')}
                disabled={profilePending}
                className={inputClasses}
              />
            </Field>
            <Field id="linkedin_url" label={t('linkedin')}>
              <input
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                defaultValue={initialProfile?.linkedin_url ?? ''}
                placeholder={t('linkedinPlaceholder')}
                disabled={profilePending}
                className={inputClasses}
              />
            </Field>
            <Field id="github_url" label={t('github')}>
              <input
                id="github_url"
                name="github_url"
                type="url"
                defaultValue={initialProfile?.github_url ?? ''}
                placeholder={t('githubPlaceholder')}
                disabled={profilePending}
                className={inputClasses}
              />
            </Field>
            <Field id="website_url" label={t('website')}>
              <input
                id="website_url"
                name="website_url"
                type="url"
                defaultValue={initialProfile?.website_url ?? ''}
                placeholder={t('websitePlaceholder')}
                disabled={profilePending}
                className={inputClasses}
              />
            </Field>
          </div>
          <SubmitRow label={tCommon('save')} pending={profilePending} />
        </form>
      </Section>

      {/* Education */}
      <Section title={t('sectionEducation')}>
        {educations.length === 0 && (
          <p className="text-sm text-navy-500">{t('noEducation')}</p>
        )}
        <ul className="space-y-3">
          {educations.map((education) => (
            <li
              key={education.id}
              className="rounded-xl border border-navy-100 bg-navy-50/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">
                    {education.institution}
                  </p>
                  {(education.degree || education.field_of_study) && (
                    <p className="text-xs text-navy-600">
                      {[education.degree, education.field_of_study].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {(education.start_date || education.end_date) && (
                    <p className="mt-1 text-[11px] text-navy-500">
                      {education.start_date ?? ''} — {education.is_current ? t('current') : (education.end_date ?? '')}
                    </p>
                  )}
                </div>
                <form action={eduDeleteBound}>
                  <input type="hidden" name="id" value={education.id} />
                  <button
                    type="submit"
                    className="rounded-md p-1.5 text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={tCommon('delete')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <form action={eduAction} className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field id="institution" label={t('schoolName')}>
            <input id="institution" name="institution" required className={inputClasses} />
          </Field>
          <Field id="degree" label={t('degree')}>
            <input id="degree" name="degree" className={inputClasses} />
          </Field>
          <Field id="field_of_study" label={t('fieldOfStudy')}>
            <input id="field_of_study" name="field_of_study" className={inputClasses} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="start_date" label={t('startDate')}>
              <input id="start_date" name="start_date" type="date" className={inputClasses} />
            </Field>
            <Field id="end_date" label={t('endDate')}>
              <input id="end_date" name="end_date" type="date" className={inputClasses} />
            </Field>
          </div>
          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" name="is_current" className="rounded border-navy-300 text-orange-600 focus:ring-orange-600" />
            {t('current')}
          </label>
          {eduState.error && (
            <p role="alert" className="sm:col-span-2 text-xs text-red-600">
              {eduState.error}
            </p>
          )}
          <SubmitRow label={t('addEducation')} pending={eduPending} />
        </form>
      </Section>

      {/* Experience */}
      <Section title={t('sectionExperience')}>
        {experiences.length === 0 && (
          <p className="text-sm text-navy-500">{t('noExperience')}</p>
        )}
        <ul className="space-y-3">
          {experiences.map((experience) => (
            <li
              key={experience.id}
              className="rounded-xl border border-navy-100 bg-navy-50/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">
                    {experience.role} · {experience.company}
                  </p>
                  {(experience.start_date || experience.end_date) && (
                    <p className="mt-1 text-[11px] text-navy-500">
                      {experience.start_date ?? ''} — {experience.is_current ? t('current') : (experience.end_date ?? '')}
                    </p>
                  )}
                  {experience.description && (
                    <p className="mt-2 text-xs text-navy-600">{experience.description}</p>
                  )}
                </div>
                <form action={expDeleteBound}>
                  <input type="hidden" name="id" value={experience.id} />
                  <button
                    type="submit"
                    className="rounded-md p-1.5 text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={tCommon('delete')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <form action={expAction} className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field id="company" label={t('companyName')}>
            <input id="company" name="company" required className={inputClasses} />
          </Field>
          <Field id="role" label={t('role')}>
            <input id="role" name="role" required className={inputClasses} />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <Field id="exp_start_date" label={t('startDate')}>
              <input id="exp_start_date" name="start_date" type="date" className={inputClasses} />
            </Field>
            <Field id="exp_end_date" label={t('endDate')}>
              <input id="exp_end_date" name="end_date" type="date" className={inputClasses} />
            </Field>
          </div>
          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" name="is_current" className="rounded border-navy-300 text-orange-600 focus:ring-orange-600" />
            {t('current')}
          </label>
          <Field id="exp_description" label={t('description')}>
            <textarea
              id="exp_description"
              name="description"
              rows={3}
              className={inputClasses}
            />
          </Field>
          {expState.error && (
            <p role="alert" className="sm:col-span-2 text-xs text-red-600">
              {expState.error}
            </p>
          )}
          <SubmitRow label={t('addExperience')} pending={expPending} />
        </form>
      </Section>

      {/* Skills */}
      <Section title={t('sectionSkills')}>
        {skills.length === 0 && (
          <p className="text-sm text-navy-500">{tSkill('noSkills')}</p>
        )}
        {skills.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                key={skill.id}
                className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800"
              >
                {skill.skill_name}
                <span className="text-[10px] font-medium text-orange-600">
                  {skill.level}
                </span>
                <form action={skillDeleteBound}>
                  <input type="hidden" name="id" value={skill.id} />
                  <button
                    type="submit"
                    className="text-orange-700 transition-colors hover:text-red-600"
                    aria-label={tCommon('delete')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-3 w-3"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={skillAction} className="mt-5 grid gap-3 sm:grid-cols-3">
          <Field id="skill_name" label={tSkill('skillName')}>
            <input id="skill_name" name="skill_name" required className={inputClasses} />
          </Field>
          <Field id="skill_level" label={tSkill('skillLevel')}>
            <select id="skill_level" name="level" defaultValue="intermediate" className={selectClasses}>
              <option value="beginner">{tSkill('skillLevelBeginner')}</option>
              <option value="intermediate">{tSkill('skillLevelIntermediate')}</option>
              <option value="advanced">{tSkill('skillLevelAdvanced')}</option>
              <option value="expert">{tSkill('skillLevelExpert')}</option>
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={skillPending}
              className="inline-flex w-full items-center justify-center rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 disabled:opacity-50"
            >
              {tSkill('addSkill')}
            </button>
          </div>
          {skillState.error && (
            <p role="alert" className="sm:col-span-3 text-xs text-red-600">
              {skillState.error}
            </p>
          )}
        </form>
      </Section>

      {/* Certifications */}
      <Section title={t('sectionCertifications')}>
        {certifications.length === 0 && (
          <p className="text-sm text-navy-500">{t('noCertifications')}</p>
        )}
        <ul className="space-y-3">
          {certifications.map((certification) => (
            <li
              key={certification.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-navy-100 bg-navy-50/40 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy-900">{certification.name}</p>
                {certification.issuer && (
                  <p className="text-xs text-navy-600">{certification.issuer}</p>
                )}
                {(certification.issue_date || certification.expiry_date) && (
                  <p className="mt-1 text-[11px] text-navy-500">
                    {certification.issue_date ?? ''} — {certification.expiry_date ?? ''}
                  </p>
                )}
              </div>
              <form action={certDeleteBound}>
                <input type="hidden" name="id" value={certification.id} />
                <button
                  type="submit"
                  className="rounded-md p-1.5 text-navy-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={tCommon('delete')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form action={certAction} className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field id="cert_name" label={t('certName')}>
            <input id="cert_name" name="name" required className={inputClasses} />
          </Field>
          <Field id="cert_issuer" label={t('certIssuer')}>
            <input id="cert_issuer" name="issuer" className={inputClasses} />
          </Field>
          <Field id="cert_issue_date" label={t('certDate')}>
            <input id="cert_issue_date" name="issue_date" type="date" className={inputClasses} />
          </Field>
          <Field id="cert_expiry_date" label={t('certExpiry')}>
            <input
              id="cert_expiry_date"
              name="expiry_date"
              type="date"
              className={inputClasses}
            />
          </Field>
          <Field id="cert_url" label={t('certName')}>
            <input
              id="cert_url"
              name="credential_url"
              type="url"
              placeholder="https://…"
              className={`${inputClasses} sm:col-span-2`}
            />
          </Field>
          {certState.error && (
            <p role="alert" className="sm:col-span-2 text-xs text-red-600">
              {certState.error}
            </p>
          )}
          <SubmitRow label={t('addCertification')} pending={certPending} />
        </form>
      </Section>

      {/* Preferences */}
      <Section title={t('sectionPreferences')}>
        <form action={profileAction} className="space-y-4">
          <Field id="preferred_locale" label={t('language')}>
            <select
              id="preferred_locale"
              name="preferred_locale"
              defaultValue={initialProfile?.preferred_locale ?? ''}
              disabled={profilePending}
              className={inputClasses}
            >
              <option value="">—</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </Field>
          <SubmitRow label={tCommon('save')} pending={profilePending} />
        </form>
      </Section>
    </div>
  );
}