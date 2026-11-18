import type { Session } from '@supabase/supabase-js';
import {
  AUTHORIZED_ADMIN_EMAIL,
  INITIAL_PORTFOLIO_DATA,
} from '../data/initialPortfolio';
import { isSupabaseConfigured, supabase, SUPABASE_URL } from '../lib/supabase';
import type { ContactMessage, PortfolioData } from '../types/portfolio';
import { resolveStorageAssetUrl } from '../utils/storage';

export const PORTFOLIO_STORAGE_BUCKET = 'portfolio-assets';

export interface PortfolioRowMeta {
  rowId: string | number | null;
  payloadColumn: 'content' | 'data' | 'portfolio_data' | 'payload';
  hasExistingRow: boolean;
}

export interface LoadedPortfolioResult {
  data: PortfolioData;
  meta: PortfolioRowMeta;
  source: 'supabase' | 'initial-seed';
  error?: string;
}

function mergeWithInitial(partial: Partial<PortfolioData>): PortfolioData {
  const rawSocial = (partial.socialLinks ?? {}) as Record<string, unknown>;
  const resolvedGithub =
    typeof rawSocial.githubUrl === 'string'
      ? rawSocial.githubUrl
      : typeof rawSocial.github_url === 'string'
        ? rawSocial.github_url
        : typeof rawSocial.github === 'string'
          ? rawSocial.github
          : INITIAL_PORTFOLIO_DATA.socialLinks.githubUrl;
  const resolvedLinkedin =
    typeof rawSocial.linkedinUrl === 'string'
      ? rawSocial.linkedinUrl
      : typeof rawSocial.linkedin_url === 'string'
        ? rawSocial.linkedin_url
        : typeof rawSocial.linkedin === 'string'
          ? rawSocial.linkedin
          : INITIAL_PORTFOLIO_DATA.socialLinks.linkedinUrl;

  const normalizedCertificates = Array.isArray(partial.certificates)
    ? partial.certificates.map((rawCert, idx) => {
        const record = (rawCert ?? {}) as unknown as Record<string, unknown>;
        const rawImage =
          typeof record.imageUrl === 'string'
            ? record.imageUrl
            : typeof record.image_url === 'string'
              ? record.image_url
              : typeof record.url === 'string'
                ? record.url
                : typeof record.image === 'string'
                  ? record.image
                  : typeof record.certificateUrl === 'string'
                    ? record.certificateUrl
                    : typeof record.fileUrl === 'string'
                      ? record.fileUrl
                      : typeof record.src === 'string'
                        ? record.src
                        : typeof record.path === 'string'
                          ? record.path
                          : null;
        return {
          ...rawCert,
          id:
            typeof record.id === 'string' && record.id.trim()
              ? record.id
              : `cert-${idx + 1}`,
          name: typeof record.name === 'string' ? record.name : '',
          issuingOrganization:
            typeof record.issuingOrganization === 'string'
              ? record.issuingOrganization
              : typeof record.issuing_organization === 'string'
                ? record.issuing_organization
                : '',
          issueDate:
            typeof record.issueDate === 'string'
              ? record.issueDate
              : typeof record.issue_date === 'string'
                ? record.issue_date
                : '',
          imageUrl: resolveStorageAssetUrl(
            rawImage,
            SUPABASE_URL,
            PORTFOLIO_STORAGE_BUCKET
          ),
        };
      })
    : INITIAL_PORTFOLIO_DATA.certificates;

  const normalizedProjects = Array.isArray(partial.projects)
    ? partial.projects.map((proj) => ({
        ...proj,
        screenshots: Array.isArray(proj.screenshots)
          ? proj.screenshots.map((shot) => ({
              ...shot,
              url:
                resolveStorageAssetUrl(
                  shot.url,
                  SUPABASE_URL,
                  PORTFOLIO_STORAGE_BUCKET
                ) ?? shot.url,
            }))
          : [],
      }))
    : INITIAL_PORTFOLIO_DATA.projects;

  const mergedProfile = {
    ...INITIAL_PORTFOLIO_DATA.profile,
    ...(partial.profile ?? {}),
  };
  mergedProfile.photoUrl = resolveStorageAssetUrl(
    mergedProfile.photoUrl,
    SUPABASE_URL,
    PORTFOLIO_STORAGE_BUCKET
  );

  const mergedResume = {
    ...INITIAL_PORTFOLIO_DATA.resume,
    ...(partial.resume ?? {}),
  };
  mergedResume.fileUrl = resolveStorageAssetUrl(
    mergedResume.fileUrl,
    SUPABASE_URL,
    PORTFOLIO_STORAGE_BUCKET
  );

  return {
    profile: mergedProfile,
    about: { ...INITIAL_PORTFOLIO_DATA.about, ...(partial.about ?? {}) },
    socialLinks: {
      githubUrl: resolvedGithub,
      linkedinUrl: resolvedLinkedin,
    },
    skills: Array.isArray(partial.skills)
      ? partial.skills
      : INITIAL_PORTFOLIO_DATA.skills,
    projects: normalizedProjects,
    education: Array.isArray(partial.education)
      ? partial.education
      : INITIAL_PORTFOLIO_DATA.education,
    certificates: normalizedCertificates,
    resume: mergedResume,
    settings: {
      ...INITIAL_PORTFOLIO_DATA.settings,
      ...(partial.settings ?? {}),
      sectionVisibility: {
        ...INITIAL_PORTFOLIO_DATA.settings.sectionVisibility,
        ...(partial.settings?.sectionVisibility ?? {}),
      },
    },
  };
}

function parsePayloadValue(raw: unknown): Partial<PortfolioData> | null {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<PortfolioData>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Partial<PortfolioData>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function extractPayloadFromRow(row: Record<string, unknown>): {
  payload: Partial<PortfolioData> | null;
  column: PortfolioRowMeta['payloadColumn'];
} {
  const candidates: PortfolioRowMeta['payloadColumn'][] = [
    'content',
    'data',
    'portfolio_data',
    'payload',
  ];

  for (const col of candidates) {
    if (col in row) {
      const parsed = parsePayloadValue(row[col]);
      if (parsed) {
        return { payload: parsed, column: col };
      }
    }
  }
  return { payload: null, column: 'content' };
}

export function isAuthorizedAdminSession(session: Session | null): boolean {
  const email = session?.user?.email?.trim().toLowerCase();
  return Boolean(email && email === AUTHORIZED_ADMIN_EMAIL.toLowerCase());
}

export async function signInAdminWithPassword(
  email: string,
  password: string
): Promise<{ session: Session | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      session: null,
      error:
        'Supabase is not configured yet. Please set VITE_SUPABASE_PUBLISHABLE_KEY in your environment.',
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    return {
      session: null,
      error: `Access denied. Only ${AUTHORIZED_ADMIN_EMAIL} is authorized to access the Admin Panel.`,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { session: null, error: error.message };
  }

  if (!isAuthorizedAdminSession(data.session)) {
    await supabase.auth.signOut();
    return {
      session: null,
      error: 'Signed-in account is not authorized for admin access.',
    };
  }

  return { session: data.session };
}

export async function signOutAdmin(): Promise<{ error?: string }> {
  if (!supabase) return {};
  const { error } = await supabase.auth.signOut();
  return error ? { error: error.message } : {};
}

export async function fetchPortfolioContent(): Promise<LoadedPortfolioResult> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      data: structuredClone(INITIAL_PORTFOLIO_DATA),
      meta: { rowId: null, payloadColumn: 'content', hasExistingRow: false },
      source: 'initial-seed',
    };
  }

  const { data, error } = await supabase
    .from('portfolio_content')
    .select('*')
    .order('id', { ascending: true })
    .limit(1);

  if (error) {
    return {
      data: structuredClone(INITIAL_PORTFOLIO_DATA),
      meta: { rowId: null, payloadColumn: 'content', hasExistingRow: false },
      source: 'initial-seed',
      error: error.message,
    };
  }

  if (!data || data.length === 0) {
    return {
      data: structuredClone(INITIAL_PORTFOLIO_DATA),
      meta: { rowId: null, payloadColumn: 'content', hasExistingRow: false },
      source: 'initial-seed',
    };
  }

  const row = data[0] as Record<string, unknown>;
  const { payload, column } = extractPayloadFromRow(row);
  const rowId =
    typeof row.id === 'string' || typeof row.id === 'number' ? row.id : null;

  return {
    data: payload ? mergeWithInitial(payload) : structuredClone(INITIAL_PORTFOLIO_DATA),
    meta: {
      rowId,
      payloadColumn: column,
      hasExistingRow: true,
    },
    source: 'supabase',
  };
}

export async function savePortfolioContent(
  portfolioData: PortfolioData,
  meta: PortfolioRowMeta
): Promise<{ ok: boolean; meta: PortfolioRowMeta; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      meta,
      error:
        'Supabase is not configured. Set VITE_SUPABASE_PUBLISHABLE_KEY before saving to database.',
    };
  }

  let effectiveMeta = meta;

  // If no row was tracked yet (e.g. initial load ran before auth), re-check the table before inserting
  if (!effectiveMeta.hasExistingRow || effectiveMeta.rowId === null) {
    const { data: existingRows } = await supabase
      .from('portfolio_content')
      .select('*')
      .order('id', { ascending: true })
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const row = existingRows[0] as Record<string, unknown>;
      const { column } = extractPayloadFromRow(row);
      const rowId =
        typeof row.id === 'string' || typeof row.id === 'number' ? row.id : null;
      if (rowId !== null) {
        effectiveMeta = {
          rowId,
          payloadColumn: column,
          hasExistingRow: true,
        };
      }
    }
  }

  if (effectiveMeta.hasExistingRow && effectiveMeta.rowId !== null) {
    const updatePayload: Record<string, unknown> = {
      [effectiveMeta.payloadColumn]: portfolioData,
      updated_at: new Date().toISOString(),
    };

    let { data: updatedRows, error } = await supabase
      .from('portfolio_content')
      .update(updatePayload)
      .eq('id', effectiveMeta.rowId)
      .select();

    if (error && error.message.toLowerCase().includes('updated_at')) {
      const retry = await supabase
        .from('portfolio_content')
        .update({ [effectiveMeta.payloadColumn]: portfolioData })
        .eq('id', effectiveMeta.rowId)
        .select();
      error = retry.error;
      updatedRows = retry.data;
    }

    if (error) {
      return { ok: false, meta: effectiveMeta, error: error.message };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return {
        ok: false,
        meta: effectiveMeta,
        error:
          'Save did not update any row in portfolio_content. Verify Supabase RLS UPDATE permissions for the authorized admin account.',
      };
    }

    return { ok: true, meta: effectiveMeta };
  }

  // No row existed yet — insert first portfolio record without overwriting existing rows
  const columnsToTry: PortfolioRowMeta['payloadColumn'][] = [
    effectiveMeta.payloadColumn,
    'content',
    'data',
  ].filter((v, idx, arr) => arr.indexOf(v) === idx) as PortfolioRowMeta['payloadColumn'][];

  let lastError = 'Unable to insert portfolio record.';
  for (const col of columnsToTry) {
    let { data: inserted, error } = await supabase
      .from('portfolio_content')
      .insert([{ id: 1, [col]: portfolioData }])
      .select()
      .limit(1);

    // Fallback if id is auto-generated (UUID / GENERATED ALWAYS AS IDENTITY)
    if (
      error &&
      (error.message.toLowerCase().includes('identity') ||
        error.message.toLowerCase().includes('uuid') ||
        error.message.toLowerCase().includes('cannot insert'))
    ) {
      const retry = await supabase
        .from('portfolio_content')
        .insert([{ [col]: portfolioData }])
        .select()
        .limit(1);
      inserted = retry.data;
      error = retry.error;
    }

    if (!error && inserted && inserted.length > 0) {
      const insertedRow = inserted[0] as Record<string, unknown>;
      const newId =
        typeof insertedRow.id === 'string' || typeof insertedRow.id === 'number'
          ? insertedRow.id
          : null;
      return {
        ok: true,
        meta: { rowId: newId, payloadColumn: col, hasExistingRow: true },
      };
    }

    if (error) {
      lastError = error.message;
      const isMissingCol =
        error.message.toLowerCase().includes('column') &&
        error.message.toLowerCase().includes('does not exist');
      if (!isMissingCol) {
        return { ok: false, meta: effectiveMeta, error: error.message };
      }
    }
  }

  return { ok: false, meta: effectiveMeta, error: lastError };
}

function mapContactRow(row: Record<string, unknown>): ContactMessage {
  return {
    id: String(row.id ?? ''),
    fullName: String(row.full_name ?? row.name ?? 'Visitor'),
    email: String(row.email ?? ''),
    subject: String(row.subject ?? '(No subject)'),
    message: String(row.message ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    read: Boolean(row.is_read ?? row.read ?? false),
  };
}

export async function submitContactMessageToSupabase(
  input: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      error:
        'Contact database is not configured yet (missing VITE_SUPABASE_PUBLISHABLE_KEY).',
    };
  }

  const payloads: Record<string, unknown>[] = [
    {
      full_name: input.fullName,
      email: input.email,
      subject: input.subject,
      message: input.message,
      is_read: false,
    },
    {
      full_name: input.fullName,
      email: input.email,
      subject: input.subject,
      message: input.message,
      read: false,
    },
    {
      name: input.fullName,
      email: input.email,
      subject: input.subject,
      message: input.message,
    },
  ];

  let lastError = 'Failed to submit contact message.';
  for (const payload of payloads) {
    const { error } = await supabase.from('contact_messages').insert([payload]);
    if (!error) {
      return { ok: true };
    }
    lastError = error.message;
    const isColumnMismatch =
      error.message.toLowerCase().includes('column') ||
      error.message.toLowerCase().includes('schema cache');
    if (!isColumnMismatch) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: false, error: lastError };
}

export async function fetchContactMessagesFromSupabase(): Promise<{
  messages: ContactMessage[];
  error?: string;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return { messages: [] };
  }

  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { messages: [], error: error.message };
  }

  return {
    messages: (data ?? []).map((row) =>
      mapContactRow(row as Record<string, unknown>)
    ),
  };
}

export async function updateContactMessageReadInSupabase(
  id: string,
  nextRead: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, error: 'Supabase not configured.' };
  }

  let { error } = await supabase
    .from('contact_messages')
    .update({ is_read: nextRead })
    .eq('id', id);

  if (
    error &&
    (error.message.toLowerCase().includes('is_read') ||
      error.message.toLowerCase().includes('schema cache'))
  ) {
    const retry = await supabase
      .from('contact_messages')
      .update({ read: nextRead })
      .eq('id', id);
    error = retry.error;
  }

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteContactMessageFromSupabase(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, error: 'Supabase not configured.' };
  }

  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
};

function resolveMimeType(file: File): string | undefined {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME_MAP[ext];
}

function buildSafeStoragePath(
  fileName: string,
  folder: 'profile' | 'projects' | 'certificates' | 'resume'
): string {
  const dotIndex = fileName.lastIndexOf('.');
  const rawStem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const rawExt = dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';

  const safeStem =
    rawStem
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'asset';
  const safeExt = rawExt.replace(/[^a-z0-9]+/g, '');
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return safeExt
    ? `${folder}/${uniquePrefix}-${safeStem}.${safeExt}`
    : `${folder}/${uniquePrefix}-${safeStem}`;
}

export function parseSupabaseStoragePublicUrl(
  rawUrl: string
): { bucket: string; filePath: string } | null {
  try {
    const parsed = new URL(rawUrl);
    const marker = '/storage/v1/object/public/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    const remainder = parsed.pathname.slice(idx + marker.length);
    const slashIdx = remainder.indexOf('/');
    if (slashIdx <= 0) return null;
    const bucket = decodeURIComponent(remainder.slice(0, slashIdx));
    const filePath = decodeURIComponent(remainder.slice(slashIdx + 1));
    if (!bucket || !filePath) return null;
    return { bucket, filePath };
  } catch {
    return null;
  }
}

export async function resolveSignedStorageUrl(
  publicUrl: string
): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  const parsed = parseSupabaseStoragePublicUrl(publicUrl);
  if (!parsed) return null;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.filePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

export async function resolveReadableAssetUrl(
  rawUrl: string | null | undefined
): Promise<string | null> {
  const trimmed = rawUrl?.trim() || null;
  if (!trimmed) return null;

  const parsed = parseSupabaseStoragePublicUrl(trimmed);
  if (!parsed) return trimmed;

  try {
    const probe = await fetch(trimmed, { method: 'HEAD', cache: 'no-store' });
    if (probe.ok) return trimmed;
  } catch {
    // Fall through to signed URL resolution
  }

  const signed = await resolveSignedStorageUrl(trimmed);
  return signed ?? trimmed;
}

export async function uploadAssetToSupabaseStorage(
  file: File,
  folder: 'profile' | 'projects' | 'certificates' | 'resume'
): Promise<{ url?: string; warning?: string; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      error:
        'Supabase is not configured. Set VITE_SUPABASE_PUBLISHABLE_KEY first.',
    };
  }

  const filePath = buildSafeStoragePath(file.name, folder);
  const contentType = resolveMimeType(file);

  const { error: uploadError } = await supabase.storage
    .from(PORTFOLIO_STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType,
    });

  if (uploadError) {
    return {
      error: `Storage upload failed (${uploadError.message}). Ensure a public Supabase Storage bucket named "${PORTFOLIO_STORAGE_BUCKET}" exists with authenticated upload policies.`,
    };
  }

  const { data } = supabase.storage
    .from(PORTFOLIO_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    return { error: 'File uploaded, but public URL could not be resolved.' };
  }

  // Check whether the public URL is immediately readable; if bucket is private, return a warning so admin can toggle Public bucket ON while still allowing preview/save
  let warning: string | undefined;
  try {
    const probe = await fetch(data.publicUrl, {
      method: 'HEAD',
      cache: 'no-store',
    });
    if (
      probe.status === 400 ||
      probe.status === 401 ||
      probe.status === 403 ||
      probe.status === 404
    ) {
      warning = `Bucket "${PORTFOLIO_STORAGE_BUCKET}" appears to be Private (public URL returned HTTP ${probe.status}). Turn ON "Public bucket" for "${PORTFOLIO_STORAGE_BUCKET}" in Supabase Dashboard → Storage so all portfolio visitors can view uploaded files.`;
    }
  } catch {
    // Ignore transient network/CORS probe failures
  }

  return { url: data.publicUrl, warning };
}
