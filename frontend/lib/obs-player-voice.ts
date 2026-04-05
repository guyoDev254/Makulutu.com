/**
 * OBS Browser Source player URL helpers (?voice=, ?browserVoice=, ?ttsGender=).
 * Must match backend obs-alerts player query params.
 */

export const OBS_GOOGLE_VOICE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Default (API env or auto)' },
  { value: 'en-US-Neural2-F', label: 'English (US) — Neural2 · female' },
  { value: 'en-US-Neural2-D', label: 'English (US) — Neural2 · male' },
  { value: 'en-US-Wavenet-F', label: 'English (US) — Wavenet · female' },
  { value: 'en-US-Wavenet-D', label: 'English (US) — Wavenet · male' },
  { value: 'en-US-Studio-O', label: 'English (US) — Studio · female' },
  { value: 'en-GB-Neural2-F', label: 'English (UK) — Neural2 · female' },
  { value: 'en-GB-Neural2-B', label: 'English (UK) — Neural2 · male' },
  { value: 'sw-KE-Wavenet-A', label: 'Kiswahili (Kenya) — Wavenet · A' },
  { value: 'sw-KE-Wavenet-B', label: 'Kiswahili (Kenya) — Wavenet · B' },
]

/** Substrings matched against speechSynthesis voice names in OBS Chromium. */
export const OBS_BROWSER_VOICE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Default (auto / gender bias)' },
  { value: 'Zira', label: 'Windows — Microsoft Zira' },
  { value: 'Samantha', label: 'macOS — Samantha' },
  { value: 'Karen', label: 'macOS — Karen' },
  { value: 'Google UK English Female', label: 'Chrome — UK English female' },
  { value: 'Google US English', label: 'Chrome — US English (check gender)' },
]

export const OBS_TTS_GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Default (server bias)' },
  { value: 'female', label: 'Prefer female voices' },
  { value: 'male', label: 'Prefer male voices' },
]

export type ObsVoiceQueryParams = {
  googleVoice?: string
  browserVoice?: string
  ttsGender?: string
}

export function appendObsPlayerVoiceParams(
  baseUrl: string,
  opts: ObsVoiceQueryParams,
): string {
  const s = baseUrl.trim()
  if (!s) return ''
  let u: URL
  if (/^https?:\/\//i.test(s)) {
    u = new URL(s)
  } else {
    const path = s.startsWith('/') ? s : `/${s}`
    u = new URL(path, 'https://placeholder.invalid')
  }
  if (opts.googleVoice) u.searchParams.set('voice', opts.googleVoice)
  else u.searchParams.delete('voice')
  if (opts.browserVoice) u.searchParams.set('browserVoice', opts.browserVoice)
  else u.searchParams.delete('browserVoice')
  if (opts.ttsGender === 'female' || opts.ttsGender === 'male') {
    u.searchParams.set('ttsGender', opts.ttsGender)
  } else {
    u.searchParams.delete('ttsGender')
  }
  if (/^https?:\/\//i.test(s)) return u.toString()
  return `${u.pathname}${u.search}`
}

export function resolveObsPlayerDisplayUrl(
  playerUrl: string | null | undefined,
  copyUrl: string | null | undefined,
  apiPublicBase: string,
): string {
  if (playerUrl) return playerUrl
  const path = copyUrl ?? ''
  const base = apiPublicBase.replace(/\/$/, '')
  if (path.startsWith('/') && base) {
    return `${base}${path}`
  }
  return path
}
