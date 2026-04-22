/** Interpolate admin-defined TTS script for creator reward alerts. */
export function renderCreatorRewardTts(
  template: string | null | undefined,
  vars: {
    displayName: string;
    rewardName: string;
    amount: number;
    message: string;
  },
): string {
  const msg = vars.message.trim();
  const base =
    `${vars.displayName} chose ${vars.rewardName} for ${vars.amount} Kenyan shillings.` +
    (msg ? ` ${msg}` : '');
  const t = template?.trim();
  if (!t) return base.slice(0, 600);
  return t
    .replace(/\{\{displayName\}\}/g, vars.displayName)
    .replace(/\{\{name\}\}/g, vars.displayName)
    .replace(/\{\{rewardName\}\}/g, vars.rewardName)
    .replace(/\{\{reward\}\}/g, vars.rewardName)
    .replace(/\{\{amount\}\}/g, String(vars.amount))
    .replace(/\{\{message\}\}/g, msg)
    .trim()
    .slice(0, 600);
}
