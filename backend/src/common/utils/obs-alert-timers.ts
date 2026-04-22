import type { PrismaClient } from '@prisma/client';
import {
  fetchCreatorWorkspacePatch,
  mergeWorkspaceObsSecs,
} from './creator-workspace-settings';

/** Settings row keys (Admin → Settings, OBS overlay). */
export const OBS_ALERT_SECS_NEW_KEY = 'obs_alert_secs_new';
export const OBS_ALERT_SECS_RENEWAL_KEY = 'obs_alert_secs_renewal';
export const OBS_ALERT_SECS_SHOUTOUT_KEY = 'obs_alert_secs_shoutout';
export const OBS_ALERT_SECS_SHOUTOUT_VIDEO_KEY =
  'obs_alert_secs_shoutout_video';

export const OBS_ALERT_TIMER_DEFAULTS_SECS = {
  new: 12,
  renewal: 12,
  shoutout: 12,
  shoutoutVideo: 45,
} as const;

/** Inclusive bounds for admin-editable display duration (seconds). */
export const OBS_ALERT_TIMER_MIN_SEC = 3;
export const OBS_ALERT_TIMER_MAX_SEC = 600;

function clampSecs(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  const r = Math.round(n);
  if (r < OBS_ALERT_TIMER_MIN_SEC) return OBS_ALERT_TIMER_MIN_SEC;
  if (r > OBS_ALERT_TIMER_MAX_SEC) return OBS_ALERT_TIMER_MAX_SEC;
  return r;
}

function parseSecs(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return clampSecs(n, fallback);
}

export type ObsAlertHideTimers = {
  newMs: number;
  renewalMs: number;
  shoutoutMs: number;
  shoutoutVideoMs: number;
  newSecs: number;
  renewalSecs: number;
  shoutoutSecs: number;
  shoutoutVideoSecs: number;
};

/**
 * How long the OBS browser overlay keeps each alert visible before hiding.
 * Values are stored as whole seconds in `settings`; player uses milliseconds.
 */
export async function resolveObsAlertHideTimers(
  prisma: PrismaClient,
  creatorId?: string | null,
): Promise<ObsAlertHideTimers> {
  const keys = [
    OBS_ALERT_SECS_NEW_KEY,
    OBS_ALERT_SECS_RENEWAL_KEY,
    OBS_ALERT_SECS_SHOUTOUT_KEY,
    OBS_ALERT_SECS_SHOUTOUT_VIDEO_KEY,
  ] as const;
  const rows = await prisma.settings.findMany({
    where: { key: { in: [...keys] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const newSecs = parseSecs(
    map.get(OBS_ALERT_SECS_NEW_KEY) ?? null,
    OBS_ALERT_TIMER_DEFAULTS_SECS.new,
  );
  const renewalSecs = parseSecs(
    map.get(OBS_ALERT_SECS_RENEWAL_KEY) ?? null,
    OBS_ALERT_TIMER_DEFAULTS_SECS.renewal,
  );
  const shoutoutSecs = parseSecs(
    map.get(OBS_ALERT_SECS_SHOUTOUT_KEY) ?? null,
    OBS_ALERT_TIMER_DEFAULTS_SECS.shoutout,
  );
  const shoutoutVideoSecs = parseSecs(
    map.get(OBS_ALERT_SECS_SHOUTOUT_VIDEO_KEY) ?? null,
    OBS_ALERT_TIMER_DEFAULTS_SECS.shoutoutVideo,
  );

  let mergedNew = newSecs;
  let mergedRenewal = renewalSecs;
  let mergedShout = shoutoutSecs;
  let mergedShoutVid = shoutoutVideoSecs;

  const cid = creatorId?.trim();
  if (cid) {
    const patch = await fetchCreatorWorkspacePatch(prisma, cid);
    const m = mergeWorkspaceObsSecs(
      {
        newSecs,
        renewalSecs,
        shoutoutSecs,
        shoutoutVideoSecs,
      },
      patch,
      OBS_ALERT_TIMER_MIN_SEC,
      OBS_ALERT_TIMER_MAX_SEC,
    );
    mergedNew = m.newSecs;
    mergedRenewal = m.renewalSecs;
    mergedShout = m.shoutoutSecs;
    mergedShoutVid = m.shoutoutVideoSecs;
  }

  return {
    newMs: mergedNew * 1000,
    renewalMs: mergedRenewal * 1000,
    shoutoutMs: mergedShout * 1000,
    shoutoutVideoMs: mergedShoutVid * 1000,
    newSecs: mergedNew,
    renewalSecs: mergedRenewal,
    shoutoutSecs: mergedShout,
    shoutoutVideoSecs: mergedShoutVid,
  };
}
