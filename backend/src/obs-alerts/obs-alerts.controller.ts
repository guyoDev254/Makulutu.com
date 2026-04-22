import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ObsAlertsService } from './obs-alerts.service';
import { ObsTtsService } from './obs-tts.service';
import { ObsTtsSynthesizeDto } from './dto/obs-tts-synthesize.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { resolveObsAlertHideTimers } from '../common/utils/obs-alert-timers';
import { fetchCreatorWorkspacePatch } from '../common/utils/creator-workspace-settings';
import { getSettingsString } from '../common/utils/support-catalog';

const OBS_SUBSCRIPTION_MESSAGE_TEMPLATE_KEY = 'obs_subscription_message_template';
const OBS_SHOUTOUT_MESSAGE_TEMPLATE_KEY = 'obs_shoutout_message_template';

@Controller('obs')
export class ObsAlertsController {
  constructor(
    private readonly obsAlerts: ObsAlertsService,
    private readonly obsTts: ObsTtsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Server-Sent Events stream for OBS Browser Source (or custom clients).
   * Query: ?token=<OBS_ALERT_SECRET>
   */
  @Get('alerts/stream')
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') token?: string,
    @Query('uid') uid?: string,
  ): Promise<void> {
    if (!(await this.obsAlerts.isEnabled())) {
      throw new ServiceUnavailableException(
        'OBS alerts disabled. Set OBS_ALERT_SECRET or create an active unique stream link.',
      );
    }
    const scopedUid = uid?.trim() || undefined;
    if (!(await this.obsAlerts.validateToken(token, scopedUid))) {
      throw new UnauthorizedException('Invalid or missing token');
    }
    const creatorScope =
      scopedUid || (await this.obsAlerts.resolveTokenCreatorScope(token));

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const write = (data: string) => {
      res.write(`data: ${data}\n\n`);
    };

    write(JSON.stringify({ type: 'connected', at: new Date().toISOString() }));

    const unsubscribe = this.obsAlerts.subscribe(write, creatorScope);

    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    const cleanup = () => {
      clearInterval(ping);
      unsubscribe();
      try {
        res.end();
      } catch {
        /* ignore */
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
  }

  /**
   * Multilingual TTS: Google Cloud Text-to-Speech when GOOGLE_CLOUD_TTS_API_KEY is set.
   * Same token as SSE/player. Returns MP3.
   */
  @Post('tts/synthesize')
  async ttsSynthesize(
    @Query('token') token: string | undefined,
    @Query('uid') uid: string | undefined,
    @Body() body: ObsTtsSynthesizeDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (!(await this.obsAlerts.isEnabled())) {
      res
        .status(503)
        .json({ code: 'obs_disabled', message: 'OBS alerts disabled' });
      return;
    }
    if (!(await this.obsAlerts.validateToken(token, uid?.trim() || undefined))) {
      res.status(401).json({ message: 'Invalid or missing token' });
      return;
    }
    if (!this.obsTts.isConfigured()) {
      res.status(503).json({
        code: 'tts_not_configured',
        message: 'Set GOOGLE_CLOUD_TTS_API_KEY for cloud TTS',
      });
      return;
    }

    try {
      const buf = await this.obsTts.synthesizeMp3(
        body.text,
        body.languageCode || 'en-US',
        body.voiceName,
      );
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.send(buf);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        const r = err.getResponse();
        res
          .status(400)
          .json(typeof r === 'string' ? { message: r } : r);
        return;
      }
      if (err instanceof ServiceUnavailableException) {
        const r = err.getResponse();
        res
          .status(503)
          .json(typeof r === 'string' ? { message: r } : r);
        return;
      }
      res.status(502).json({ code: 'tts_error', message: 'TTS failed' });
    }
  }

  /**
   * Full-page overlay for OBS Browser Source: Web Speech API (browser TTS) only.
   * URL: https://your-api/obs/player?token=YOUR_SECRET
   * Optional query: voice=en-US-Wavenet-F (Google Cloud TTS voice name),
   * browserVoice=Zira (substring match on local OBS/Chromium speech voices),
   * ttsGender=female|male (browser fallback bias).
   */
  @Get('player')
  async player(
    @Res() res: Response,
    @Query('token') token?: string,
    @Query('uid') uid?: string,
  ): Promise<void> {
    if (!(await this.obsAlerts.isEnabled())) {
      throw new ServiceUnavailableException(
        'OBS alerts disabled. Set OBS_ALERT_SECRET or create an active unique stream link.',
      );
    }
    const scopedUid = uid?.trim() || undefined;
    if (!(await this.obsAlerts.validateToken(token, scopedUid))) {
      res.status(401).type('html').send(this.errorPage('Invalid or missing token'));
      return;
    }

    const creatorScope =
      scopedUid || (await this.obsAlerts.resolveTokenCreatorScope(token));

    const preferFemaleBrowser =
      this.config.get<string>('OBS_BROWSER_TTS_PREFER_FEMALE') !== 'false';
    const timers = await resolveObsAlertHideTimers(
      this.prisma,
      creatorScope ?? undefined,
    );
    const workspacePatch = creatorScope
      ? await fetchCreatorWorkspacePatch(this.prisma, creatorScope)
      : {};
    const [globalSubscriptionTemplate, globalShoutoutTemplate] =
      await Promise.all([
        getSettingsString(this.prisma, OBS_SUBSCRIPTION_MESSAGE_TEMPLATE_KEY),
        getSettingsString(this.prisma, OBS_SHOUTOUT_MESSAGE_TEMPLATE_KEY),
      ]);
    const subscriptionTemplate =
      workspacePatch.obsSubscriptionMessageTemplate?.trim() ||
      globalSubscriptionTemplate ||
      '';
    const shoutoutTemplate =
      workspacePatch.obsShoutoutMessageTemplate?.trim() ||
      globalShoutoutTemplate ||
      '';
    res
      .type('html')
      .send(
        this.playerHtml(
          this.obsTts.isConfigured(),
          preferFemaleBrowser,
          timers,
          subscriptionTemplate,
          shoutoutTemplate,
        ),
      );
  }

  private errorPage(message: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>OBS alerts</title></head><body style="margin:0;background:transparent;color:#fff;font-family:sans-serif;padding:24px;">${message}</body></html>`;
  }

  private playerHtml(
    cloudTtsConfigured: boolean,
    preferFemaleBrowser: boolean,
    timers: {
      newMs: number;
      renewalMs: number;
      shoutoutMs: number;
      shoutoutVideoMs: number;
    },
    subscriptionTemplate: string,
    shoutoutTemplate: string,
  ): string {
    const cloudJs = cloudTtsConfigured ? 'true' : 'false';
    const preferFemaleJs = preferFemaleBrowser ? 'true' : 'false';
    const hideMsNew = Math.max(1000, Math.floor(timers.newMs));
    const hideMsRenewal = Math.max(1000, Math.floor(timers.renewalMs));
    const hideMsShoutout = Math.max(1000, Math.floor(timers.shoutoutMs));
    const hideMsShoutoutVideo = Math.max(
      1000,
      Math.floor(timers.shoutoutVideoMs),
    );
    const subscriptionTemplateJs = JSON.stringify(subscriptionTemplate || '');
    const shoutoutTemplateJs = JSON.stringify(shoutoutTemplate || '');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Subscriber alerts</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&amp;family=Nunito:wght@800;900&amp;family=Orbitron:wght@600;700;800&amp;family=Rajdhani:wght@500;600;700&amp;display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: transparent; overflow: hidden; }
    #card.kind-new {
      --accent: #ccff00;
      --accent-dim: #5a7300;
      --accent-soft: rgba(204, 255, 0, 0.55);
      --accent-glow: rgba(204, 255, 0, 0.5);
      --secondary: #00f5d4;
      --scan: rgba(204, 255, 0, 0.12);
    }
    #card.kind-renewal {
      --accent: #ffcc00;
      --accent-dim: #8a6a00;
      --accent-soft: rgba(255, 204, 0, 0.55);
      --accent-glow: rgba(255, 204, 0, 0.45);
      --secondary: #ff9500;
      --scan: rgba(255, 204, 0, 0.12);
    }
    #card.kind-shoutout {
      --accent: #00e8ff;
      --accent-dim: #006a78;
      --accent-soft: rgba(0, 232, 255, 0.55);
      --accent-glow: rgba(0, 232, 255, 0.5);
      --secondary: #ccff00;
      --scan: rgba(0, 232, 255, 0.14);
    }
    #card.kind-coaching-booking {
      --accent: #a78bfa;
      --accent-dim: #5b21b6;
      --accent-soft: rgba(167, 139, 250, 0.55);
      --accent-glow: rgba(167, 139, 250, 0.5);
      --secondary: #c4b5fd;
      --scan: rgba(167, 139, 250, 0.14);
    }
    #card.kind-creator-reward {
      --accent: #fbbf24;
      --accent-dim: #b45309;
      --accent-soft: rgba(251, 191, 36, 0.55);
      --accent-glow: rgba(251, 191, 36, 0.5);
      --secondary: #fde68a;
      --scan: rgba(251, 191, 36, 0.14);
    }
    @keyframes hud-enter {
      0% { opacity: 0; transform: scale(0.92) translateY(36px); }
      55% { opacity: 1; transform: scale(1.02) translateY(-6px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes hud-pulse-border {
      0%, 100% {
        box-shadow:
          0 0 0 1px var(--accent-soft),
          0 0 24px var(--accent-glow),
          inset 0 0 36px rgba(0,0,0,0.55);
      }
      50% {
        box-shadow:
          0 0 0 1px var(--accent),
          0 0 36px var(--accent-glow),
          inset 0 0 44px rgba(0,240,255,0.05);
      }
    }
    @keyframes hud-sweep {
      0% { transform: translateX(-120%); opacity: 0; }
      15% { opacity: 1; }
      85% { opacity: 1; }
      100% { transform: translateX(280%); opacity: 0; }
    }
    #wrap {
      display: flex; align-items: center; justify-content: center;
      min-height: 100%; padding: 28px;
      font-family: "Rajdhani", ui-sans-serif, system-ui, sans-serif;
    }
    /* No filter on #card: Chromium/OBS can silence cross-origin iframe + <audio> when an ancestor uses filter. */
    #card {
      position: relative;
      max-width: min(540px, 94vw);
      opacity: 0;
      transform: scale(0.94) translateY(20px);
      transition: opacity 0.35s ease, transform 0.35s ease;
      pointer-events: none;
    }
    #card.show {
      animation: hud-enter 0.58s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      transition: none;
    }
    /* OBS/CEF: entrance animation can fail to apply "forwards" — card stays opacity:0 (audio OK, video invisible). */
    #card.show.shoutout-video-only {
      opacity: 1 !important;
      transform: none !important;
      animation: none !important;
    }
    #card.show .card-inner {
      animation: hud-pulse-border 2.4s ease-in-out 3 forwards;
    }
    /* Shoutout + TikTok clip phase 2: show iframe only (no @handle / text / badge) */
    #card.shoutout-video-only {
      max-width: min(418px, 96vw);
    }
    #card.shoutout-video-only #buzz-stack {
      display: none !important;
    }
    /* Inset shadow from hud-pulse-border paints over children — kills TikTok visibility (audio still plays). */
    #card.shoutout-video-only .card-inner {
      padding: 12px 14px 14px;
      animation: none !important;
      box-shadow: none !important;
    }
    #card.shoutout-video-only #video-wrap {
      margin-top: 0;
      position: relative;
      z-index: 10;
      isolation: isolate;
      clip-path: none !important;
    }
    /* Plain video mode: remove HUD frame/background so only clip is visible. */
    #card.video-plain .card-frame {
      padding: 0;
      background: transparent !important;
      clip-path: none !important;
      box-shadow: none !important;
      overflow: visible !important;
    }
    #card.video-plain .card-inner {
      padding: 0 !important;
      background: transparent !important;
      border: 0 !important;
      clip-path: none !important;
      box-shadow: none !important;
      animation: none !important;
      overflow: visible !important;
    }
    #card.video-plain #video-wrap {
      border: 0 !important;
      box-shadow: none !important;
      clip-path: none !important;
      background: #000 !important;
      z-index: 10;
    }
    #card .card-frame {
      position: relative;
      padding: 2px;
      background: linear-gradient(145deg, var(--accent) 0%, var(--secondary) 50%, var(--accent-dim) 100%);
      clip-path: polygon(18px 0%, 100% 0%, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0% 100%, 0% 18px);
      box-shadow:
        0 0 32px var(--accent-glow),
        0 22px 56px rgba(0,0,0,0.78);
    }
    #card .card-inner {
      position: relative;
      clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
      background: linear-gradient(165deg, #14181c 0%, #0a0c0f 48%, #0d1014 100%);
      padding: 20px 22px 22px;
      text-align: center;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .hud-texture {
      position: absolute;
      inset: 0;
      opacity: 0.11;
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 14px 14px;
      pointer-events: none;
    }
    .hud-texture::after {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 90% 55% at 50% 0%, var(--accent-soft), transparent 62%);
      opacity: 0.35;
    }
    .hud-scanline {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 1;
    }
    .hud-scanline::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 45%;
      height: 100%;
      background: linear-gradient(90deg, transparent, var(--scan), transparent);
      animation: hud-sweep 2.6s ease-in-out infinite;
      animation-play-state: paused;
    }
    #card.show .hud-scanline::after { animation-play-state: running; }
    .hud-corner {
      position: absolute;
      width: 22px;
      height: 22px;
      z-index: 2;
      pointer-events: none;
      border: 2px solid var(--accent);
      opacity: 0.95;
      box-shadow: 0 0 10px var(--accent-glow);
    }
    .hud-corner-tl { top: 10px; left: 10px; border-right: none; border-bottom: none; }
    .hud-corner-tr { top: 10px; right: 10px; border-left: none; border-bottom: none; }
    .hud-corner-bl { bottom: 10px; left: 10px; border-right: none; border-top: none; }
    .hud-corner-br { bottom: 10px; right: 10px; border-left: none; border-top: none; }
    .hud-top-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      padding: 0 2px;
      position: relative;
      z-index: 3;
    }
    .hud-hazard {
      width: 36px;
      height: 11px;
      background: repeating-linear-gradient(
        -45deg,
        var(--accent) 0 4px,
        #0a0a0a 4px 8px
      );
      box-shadow: 0 0 10px var(--accent-glow);
    }
    .hud-bits {
      width: 5px;
      height: 5px;
      background: var(--accent);
      opacity: 0.9;
      box-shadow:
        9px 0 0 0 var(--accent),
        18px 0 0 0 var(--accent),
        0 9px 0 0 var(--accent),
        9px 9px 0 0 var(--accent),
        18px 9px 0 0 var(--accent);
      filter: drop-shadow(0 0 4px var(--accent-glow));
    }
    /* TikTok vertical 9:16 — min-height fallback if aspect-ratio is ignored (OBS older CEF → 0px tall box). */
    #video-wrap {
      margin-top: 16px;
      margin-left: auto;
      margin-right: auto;
      width: min(100%, 330px);
      aspect-ratio: 9 / 16;
      min-height: 352px;
      max-height: min(82.5vh, 660px);
      overflow: hidden;
      position: relative;
      z-index: 3;
      border: 1px solid var(--accent);
      background: #000;
      clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
      box-shadow: 0 0 20px var(--accent-glow);
    }
    #video-wrap.hidden { display: none !important; }
    #video-iframe {
      position: absolute;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
      min-width: 100%;
      min-height: 100%;
      border: 0;
      background: #000;
      opacity: 1;
      visibility: visible;
    }
    #status {
      position: fixed;
      bottom: 8px;
      left: 12px;
      font-size: 11px;
      font-family: "Rajdhani", sans-serif;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: rgba(204,255,0,0.35);
      max-width: 70vw;
      text-transform: uppercase;
    }
    #unlock {
      position: fixed;
      inset: 0;
      z-index: 50;
      cursor: pointer;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 20%;
      background: rgba(0,0,0,0.55);
      color: rgba(230,255,220,0.92);
      font-size: 14px;
      font-family: "Rajdhani", sans-serif;
      text-align: center;
    }
    #unlock .unlock-inner {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(165deg, #12151a 0%, #0a0c0f 100%);
      padding: 16px 24px;
      border: 1px solid #ccff00;
      clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
      box-shadow: 0 0 28px rgba(204,255,0,0.35), 0 12px 40px rgba(0,0,0,0.5);
    }
    #unlock .unlock-inner svg {
      width: 22px;
      height: 22px;
      color: #ccff00;
      flex-shrink: 0;
      filter: drop-shadow(0 0 8px rgba(204,255,0,0.6));
    }
    #unlock .unlock-inner span {
      font-family: "Orbitron", sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      max-width: 280px;
      line-height: 1.4;
    }
    #unlock.hidden { display: none; }

    /* SociaBuzz-style alert: blue HEY banner, green amount line, yellow message (bold + heavy shadow) */
    #card.alert-buzz {
      max-width: min(440px, 96vw);
      font-family: "Fredoka", "Nunito", system-ui, sans-serif;
    }
    #card.alert-buzz .card-frame,
    #card.alert-buzz .buzz-inner {
      background: transparent !important;
      clip-path: none !important;
      box-shadow: none !important;
      border: none !important;
    }
    #card.alert-buzz .buzz-inner {
      animation: none !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    .buzz-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      text-align: center;
      padding: 10px 14px;
    }
    .buzz-blue {
      background: linear-gradient(180deg, #2d8ae6 0%, #1e6ec4 55%, #1a5daa 100%);
      border-radius: 20px;
      padding: 0.5em 1.75em 0.7em;
      min-width: 220px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        0 4px 0 #0d4a8c,
        0 10px 24px rgba(0, 0, 0, 0.4);
    }
    @keyframes buzz-title-bounce {
      0%, 100% {
        transform: scale(1) translateY(0);
        text-shadow:
          4px 4px 0 #0a2540,
          0 2px 0 rgba(0, 0, 0, 0.15),
          0 0 0 rgba(255, 255, 255, 0);
      }
      40% {
        transform: scale(1.1) translateY(-4px);
        text-shadow:
          4px 5px 0 #0a2540,
          0 3px 0 rgba(0, 0, 0, 0.12),
          0 0 22px rgba(255, 255, 255, 0.45);
      }
      70% {
        transform: scale(1.04) translateY(-1px);
        text-shadow:
          4px 4px 0 #0a2540,
          0 2px 0 rgba(0, 0, 0, 0.15),
          0 0 12px rgba(56, 232, 245, 0.35);
      }
    }
    #buzz-title {
      display: inline-block;
      font-family: "Fredoka", "Nunito", system-ui, sans-serif;
      font-size: clamp(2.1rem, 6vw, 2.85rem);
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #fff;
      text-shadow: 4px 4px 0 #0a2540, 0 2px 0 rgba(0, 0, 0, 0.15);
      line-height: 1.05;
      transform-origin: center center;
    }
    #card.show #buzz-title {
      animation: buzz-title-bounce 1.15s ease-in-out infinite;
    }
    .buzz-blue-line {
      height: 9px;
      margin-top: 10px;
      border-radius: 5px;
      background: linear-gradient(180deg, #38e8f5 0%, #0ea5b8 50%, #0c3d5c 100%);
      box-shadow: 0 4px 0 #062031;
    }
    @keyframes buzz-shake {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      15% { transform: translate(-2px, 1px) rotate(-1.2deg); }
      30% { transform: translate(1px, -1px) rotate(1deg); }
      45% { transform: translate(-1px, -1px) rotate(-0.8deg); }
      60% { transform: translate(2px, 1px) rotate(0.9deg); }
      75% { transform: translate(-1px, 0) rotate(-0.5deg); }
    }
    @keyframes buzz-name-pop {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    #buzz-primary {
      margin: 0;
      max-width: 100%;
    }
    .buzz-primary-row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: center;
      gap: 0.2em 0.45em;
      line-height: 1.15;
      text-align: center;
    }
    .buzz-prefix:not(:empty) {
      flex: 0 0 100%;
      font-size: clamp(0.82rem, 2.6vw, 0.98rem);
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #a5b4fc;
      text-shadow: 1px 1px 0 #000, 2px 2px 0 #000;
      margin-bottom: 0.2em;
    }
    .buzz-prefix:empty {
      display: none !important;
    }
    .buzz-amount-block {
      display: inline-flex;
      align-items: baseline;
      gap: 0.12em;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .buzz-amount-block.buzz-hidden {
      display: none !important;
    }
    .buzz-currency {
      font-size: clamp(0.95rem, 3vw, 1.15rem);
      color: #fb7185;
      text-shadow:
        0 0 2px #000,
        2px 2px 0 #000,
        3px 3px 0 #000;
    }
    .buzz-amount {
      display: inline-block;
      font-size: clamp(1.45rem, 5vw, 2.15rem);
      font-weight: 900;
      color: #ff9100;
      text-shadow:
        0 0 2px #000,
        2px 2px 0 #000,
        3px 3px 0 #000,
        4px 4px 0 rgba(0, 0, 0, 0.45);
      animation: buzz-shake 0.42s ease-in-out infinite;
      transform-origin: center center;
    }
    .buzz-connector {
      font-size: clamp(0.95rem, 3vw, 1.12rem);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #bef264;
      text-shadow:
        0 0 2px #000,
        2px 2px 0 #000;
    }
    .buzz-connector:empty {
      display: none !important;
    }
    .buzz-username {
      display: inline-block;
      font-size: clamp(1.25rem, 4.2vw, 1.75rem);
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: #67e8f9;
      text-shadow:
        0 0 2px #000,
        2px 2px 0 #000,
        3px 3px 0 #000,
        0 0 18px rgba(103, 232, 249, 0.35);
      animation: buzz-name-pop 1.1s ease-in-out infinite;
      transform-origin: center center;
      word-break: break-word;
      max-width: 100%;
    }
    .buzz-platform {
      font-size: clamp(0.88rem, 2.8vw, 1.05rem);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #c8f542;
      text-shadow:
        0 0 2px #000,
        2px 2px 0 #000;
    }
    .buzz-platform:empty {
      display: none !important;
    }
    #buzz-secondary {
      margin: 0;
      font-size: clamp(0.98rem, 3.1vw, 1.22rem);
      font-weight: 800;
      color: #fde047;
      text-shadow:
        0 0 2px #000,
        2px 2px 0 #000,
        3px 3px 0 #000,
        -1px -1px 0 #000;
      line-height: 1.35;
      white-space: pre-line;
      max-width: 100%;
    }
    #buzz-secondary:empty {
      display: none !important;
    }

    @media (prefers-reduced-motion: reduce) {
      #card.show {
        animation: none;
        opacity: 1;
        transform: none;
        transition: opacity 0.25s ease;
      }
      #card.show .card-inner { animation: none; }
      .hud-scanline::after { animation: none !important; }
      .buzz-amount,
      .buzz-username,
      #buzz-title {
        animation: none !important;
      }
    }
  </style>
</head>
<body>
  
  <div id="wrap">
    <div id="card" aria-live="polite" class="kind-new alert-buzz">
      <div class="card-frame buzz-frame">
        <div class="card-inner buzz-inner">
          <div id="buzz-stack" class="buzz-stack">
            <div class="buzz-blue">
              <span id="buzz-title">NEW SUB!</span>
              <div class="buzz-blue-line" aria-hidden="true"></div>
            </div>
            <div id="buzz-primary" class="buzz-primary-row">
              <span id="buzz-prefix" class="buzz-prefix"></span>
              <div id="buzz-amount-block" class="buzz-amount-block buzz-hidden">
                <span class="buzz-currency">KES</span>
                <span id="buzz-amount" class="buzz-amount"></span>
              </div>
              <span id="buzz-connector" class="buzz-connector"></span>
              <span id="buzz-username" class="buzz-username"></span>
              <span id="buzz-platform" class="buzz-platform"></span>
            </div>
            <p id="buzz-secondary"></p>
          </div>
          <div id="video-wrap" class="hidden" aria-hidden="true">
            <iframe id="video-iframe" title="Shoutout clip" allowfullscreen scrolling="no" loading="eager" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write" referrerpolicy="strict-origin-when-cross-origin"></iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="status"></div>
  <div id="unlock" role="button" tabindex="0" aria-label="Enable alert sound">
    <div class="unlock-inner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
      <span>Tap to enable TTS and clip audio (OBS / browser)</span>
    </div>
  </div>
  <script>
(function () {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';
  var uid = params.get('uid') || '';
  var cloudTtsConfigured = ${cloudJs};
  var preferFemaleBrowserDefault = ${preferFemaleJs};
  var ttsVoiceGoogle = (params.get('voice') || '').trim().slice(0, 64);
  if (ttsVoiceGoogle && !/^[A-Za-z0-9._-]+$/.test(ttsVoiceGoogle)) ttsVoiceGoogle = '';
  var ttsVoiceBrowser = (params.get('browserVoice') || '').trim().slice(0, 128);
  var card = document.getElementById('card');
  var buzzTitleEl = document.getElementById('buzz-title');
  var buzzPrefixEl = document.getElementById('buzz-prefix');
  var buzzAmountBlockEl = document.getElementById('buzz-amount-block');
  var buzzAmountEl = document.getElementById('buzz-amount');
  var buzzConnectorEl = document.getElementById('buzz-connector');
  var buzzUsernameEl = document.getElementById('buzz-username');
  var buzzPlatformEl = document.getElementById('buzz-platform');
  var buzzSecondaryEl = document.getElementById('buzz-secondary');

  function clearBuzzRow() {
    if (buzzPrefixEl) buzzPrefixEl.textContent = '';
    if (buzzAmountBlockEl) buzzAmountBlockEl.classList.add('buzz-hidden');
    if (buzzAmountEl) buzzAmountEl.textContent = '';
    if (buzzConnectorEl) buzzConnectorEl.textContent = '';
    if (buzzUsernameEl) buzzUsernameEl.textContent = '';
    if (buzzPlatformEl) buzzPlatformEl.textContent = '';
  }
  var videoWrapEl = document.getElementById('video-wrap');
  var videoIframeEl = document.getElementById('video-iframe');
  var statusEl = document.getElementById('status');
  var unlockEl = document.getElementById('unlock');
  var hideTimer;
  var alertQueue = [];
  var alertProcessing = false;
  var activeTtsBufferSource = null;
  var activeTtsHtmlAudio = null;

  function stopActiveTtsOutput() {
    try {
      if (window.speechSynthesis) speechSynthesis.cancel();
    } catch (e0) {}
    try {
      if (activeTtsBufferSource) {
        activeTtsBufferSource.stop(0);
        activeTtsBufferSource = null;
      }
    } catch (e1) {}
    try {
      if (activeTtsHtmlAudio) {
        activeTtsHtmlAudio.pause();
        activeTtsHtmlAudio.removeAttribute('src');
        activeTtsHtmlAudio.load();
        activeTtsHtmlAudio = null;
      }
    } catch (e2) {}
  }

  var HIDE_MS_NEW = ${hideMsNew};
  var HIDE_MS_RENEWAL = ${hideMsRenewal};
  var HIDE_MS_SHOUTOUT = ${hideMsShoutout};
  var HIDE_MS_SHOUTOUT_VIDEO = ${hideMsShoutoutVideo};
  var OBS_SUBSCRIPTION_TEMPLATE = ${subscriptionTemplateJs};
  var OBS_SHOUTOUT_TEMPLATE = ${shoutoutTemplateJs};

  function templateLine(tpl, vars) {
    var src = (tpl && String(tpl).trim()) || '';
    if (!src) return '';
    return src
      .replace(/\{\{\s*name\s*\}\}/gi, vars.name || '')
      .replace(/\{\{\s*platform\s*\}\}/gi, vars.platform || '')
      .replace(/\{\{\s*amount\s*\}\}/gi, vars.amount || '')
      .replace(/\{\{\s*message\s*\}\}/gi, vars.message || '')
      .replace(/\{\{\s*kind\s*\}\}/gi, vars.kind || '')
      .replace(/\{\{\s*displayName\s*\}\}/gi, vars.name || '')
      .replace(/\{\{\s*tiktokUsername\s*\}\}/gi, vars.name || '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 500);
  }
  var videoPlayTimers = [];
  var audioUnlocked = false;

  function clearVideoPlayTimers() {
    videoPlayTimers.forEach(function (id) { clearTimeout(id); });
    videoPlayTimers = [];
  }

  /** TikTok player API: play + unMute (sound) — repeat in case autoplay starts muted. */
  function postToTikTokPlayer(type) {
    if (!videoIframeEl) return;
    try {
      videoIframeEl.contentWindow.postMessage(
        { type: type, 'x-tiktok-player': true },
        '*'
      );
    } catch (e) {}
  }

  function scheduleTikTokEmbedPlay() {
    if (!videoIframeEl) return;
    var delays = [0, 150, 400, 800, 1400, 2200, 3200];
    delays.forEach(function (ms) {
      var tid = setTimeout(function () {
        postToTikTokPlayer('play');
        setTimeout(function () {
          postToTikTokPlayer('unMute');
        }, 60);
      }, ms);
      videoPlayTimers.push(tid);
    });
  }

  function setStatus(t) { statusEl.textContent = t; }

  var path = window.location.pathname || '';
  var base = /\\/obs\\/player\\/?$/i.test(path)
    ? path.replace(/\\/obs\\/player\\/?$/i, '')
    : '';
  function apiRoot() { return window.location.origin + base; }

  function pickBrowserVoice(lang) {
    if (!window.speechSynthesis) return null;
    var voices = speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    if (ttsVoiceBrowser) {
      var pickHint = ttsVoiceBrowser.toLowerCase();
      var pi, pv;
      for (pi = 0; pi < voices.length; pi++) {
        pv = (voices[pi].name || '').toLowerCase();
        if (pv === pickHint) return voices[pi];
      }
      for (pi = 0; pi < voices.length; pi++) {
        pv = (voices[pi].name || '').toLowerCase();
        if (pv.indexOf(pickHint) >= 0) return voices[pi];
      }
    }
    var qg = (params.get('ttsGender') || '').toLowerCase();
    var preferF = preferFemaleBrowserDefault;
    if (qg === 'male' || qg === 'm') preferF = false;
    if (qg === 'female' || qg === 'f') preferF = true;
    var lc = (lang || 'en-US').split('-')[0].toLowerCase();
    var femaleHints = [
      'female', 'zira', 'samantha', 'karen', 'victoria', 'hazel', 'paulina',
      'fiona', 'martha', 'tessa', 'moira', 'serena', 'ava', 'allison',
      'kimberly', 'kendra', 'joanna', 'ivy', 'laura', 'sarah', 'ruth', 'emma',
      'millie', 'poppy', 'olivia', 'megan', 'amy', 'lesley', 'shelley',
      'google uk english female', 'english female', 'en-us-wavenet-f',
      'en-us-neural2-f', 'wavenet-f', 'neural2-f'
    ];
    var maleHints = [
      ' male', 'male ', 'david', 'daniel', 'mark ', ' fred', 'thomas',
      'jorge', 'juan', ' james', 'george', 'arthur', 'aaron', 'richard',
      'oliver', 'frederick', 'google uk english male', 'google us english male',
      'microsoft mark', 'microsoft david', 'microsoft george', 'en-us-wavenet-d',
      'en-us-neural2-d', 'wavenet-d', 'neural2-d'
    ];
    var scored = voices.map(function (v) {
      var s = 0;
      var vl = (v.lang || '').toLowerCase();
      if (vl.indexOf(lc) === 0) s += 40;
      else if (vl.indexOf(lc) >= 0) s += 20;
      var n = (v.name || '').toLowerCase();
      if (n.indexOf('google') >= 0) s += 25;
      if (n.indexOf('microsoft') >= 0 || n.indexOf('zira') >= 0 || n.indexOf('samantha') >= 0) s += 15;
      if (n.indexOf('premium') >= 0 || n.indexOf('enhanced') >= 0) s += 10;
      if (v.localService === true) s += 5;
      if (n.indexOf('compact') >= 0 || n.indexOf('eloquence') >= 0) s -= 8;
      if (preferF) {
        var i;
        for (i = 0; i < femaleHints.length; i++) {
          if (n.indexOf(femaleHints[i]) >= 0) { s += 38; break; }
        }
        for (i = 0; i < maleHints.length; i++) {
          if (n.indexOf(maleHints[i]) >= 0) { s -= 45; break; }
        }
      }
      return { v: v, s: s };
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored[0] ? scored[0].v : voices[0];
  }

  function speakBrowserPromise(text, lang, voiceRetry) {
    return new Promise(function (resolve) {
      try {
        if (!window.speechSynthesis) {
          resolve();
          return;
        }
        var vr = typeof voiceRetry === 'number' ? voiceRetry : 0;
        if (!speechSynthesis.getVoices().length && vr < 10) {
          window.setTimeout(function () {
            speakBrowserPromise(text, lang, vr + 1).then(resolve);
          }, 180);
          return;
        }
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        u.pitch = 1;
        u.lang = lang || 'en-US';
        u.volume = 1;
        var v = pickBrowserVoice(u.lang);
        if (v) u.voice = v;
        var settled = false;
        function done() {
          if (settled) return;
          settled = true;
          window.clearTimeout(failsafeTimer);
          resolve();
        }
        var failsafeMs = Math.min(120000, Math.max(3000, String(text).length * 70));
        var failsafeTimer = window.setTimeout(done, failsafeMs);
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      } catch (e) {
        console.warn('Browser TTS failed', e);
        resolve();
      }
    });
  }

  var MAX_TTS_INPUT_CHARS = 5000;

  var ttsAudioContext = null;

  /** Run synchronously inside the unlock click so MP3 TTS and Web Speech work after async alerts. */
  function unlockAudioPipeline() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        if (!ttsAudioContext) ttsAudioContext = new AC();
        var ctx = ttsAudioContext;
        var g = ctx.createGain();
        g.gain.value = 0;
        var o = ctx.createOscillator();
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.06);
        ctx.resume().catch(function () {});
      }
    } catch (e) {}
  }

  /** Play MP3 through the same AudioContext unlocked on “Tap to enable” — HTMLAudioElement.play() often stays blocked after async in OBS/Chromium. */
  function speakCloudBufferWebAudio(mp3ArrayBuffer) {
    return new Promise(function (resolve, reject) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          reject(new Error('no AudioContext'));
          return;
        }
        if (!ttsAudioContext) ttsAudioContext = new AC();
        var ctx = ttsAudioContext;
        var copy = mp3ArrayBuffer.slice(0);
        ctx
          .resume()
          .then(function () {
            return ctx.decodeAudioData(copy);
          })
          .then(function (buffer) {
            return ctx.resume().then(function () {
              return buffer;
            });
          })
          .then(function (buffer) {
            var src = ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(ctx.destination);
            activeTtsBufferSource = src;
            src.onended = function () {
              if (activeTtsBufferSource === src) activeTtsBufferSource = null;
              resolve();
            };
            try {
              src.start(0);
            } catch (startErr) {
              if (activeTtsBufferSource === src) activeTtsBufferSource = null;
              reject(startErr);
            }
          })
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  function speakCloudBufferHtmlAudio(mp3ArrayBuffer) {
    var blob = new Blob([mp3ArrayBuffer], { type: 'audio/mpeg' });
    var url = URL.createObjectURL(blob);
    var audio = new Audio();
    audio.src = url;
    audio.volume = 1;
    activeTtsHtmlAudio = audio;
    return audio
      .play()
      .then(function () {
        return new Promise(function (resolve, reject) {
          audio.onerror = function () {
            if (activeTtsHtmlAudio === audio) activeTtsHtmlAudio = null;
            URL.revokeObjectURL(url);
            reject(new Error('audio element error'));
          };
          audio.onended = function () {
            if (activeTtsHtmlAudio === audio) activeTtsHtmlAudio = null;
            URL.revokeObjectURL(url);
            resolve();
          };
        });
      })
      .catch(function (e) {
        if (activeTtsHtmlAudio === audio) activeTtsHtmlAudio = null;
        URL.revokeObjectURL(url);
        throw e;
      });
  }

  function speakCloud(text, lang) {
    var payloadText = String(text || '').slice(0, MAX_TTS_INPUT_CHARS);
    var ttsBody = { text: payloadText, languageCode: lang || 'en-US' };
    if (ttsVoiceGoogle) ttsBody.voiceName = ttsVoiceGoogle;
    var ttsUrl = apiRoot() + '/obs/tts/synthesize?token=' + encodeURIComponent(token);
    if (uid) ttsUrl += '&uid=' + encodeURIComponent(uid);
    return fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify(ttsBody),
    })
      .then(function (r) {
        if (!r.ok) throw new Error('TTS HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        return speakCloudBufferWebAudio(buf).catch(function () {
          return speakCloudBufferHtmlAudio(buf);
        });
      });
  }

  function speakAlertPromise(text, lang) {
    var t = String(text || '').trim().slice(0, MAX_TTS_INPUT_CHARS);
    if (!t) return Promise.resolve();
    if (cloudTtsConfigured && token) {
      return speakCloud(t, lang).catch(function () {
        return speakBrowserPromise(t, lang);
      });
    }
    return speakBrowserPromise(t, lang);
  }

  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = function () {};
  }

  function dismissUnlock() {
    audioUnlocked = true;
    if (unlockEl) unlockEl.classList.add('hidden');
    unlockAudioPipeline();
    try {
      if (window.speechSynthesis) {
        speechSynthesis.resume();
        var w = new SpeechSynthesisUtterance(' ');
        w.volume = 0.03;
        w.rate = 10;
        speechSynthesis.speak(w);
      }
    } catch (e) {}
    try {
      if (
        videoIframeEl &&
        videoIframeEl.src &&
        videoIframeEl.src.indexOf('tiktok.com/player/') >= 0
      ) {
        postToTikTokPlayer('play');
        postToTikTokPlayer('unMute');
      }
    } catch (e) {}
  }

  if (unlockEl) {
    unlockEl.addEventListener('click', dismissUnlock);
    unlockEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        dismissUnlock();
      }
    });
  }

  function dismissAlertCard() {
    card.classList.remove('show', 'shoutout-video-only', 'video-plain');
    clearVideoPlayTimers();
    if (videoWrapEl) {
      videoWrapEl.classList.add('hidden');
      videoWrapEl.setAttribute('aria-hidden', 'true');
    }
    if (videoIframeEl) {
      videoIframeEl.onload = null;
      videoIframeEl.src = '';
    }
  }

  function scheduleDismiss(ms) {
    return new Promise(function (resolve) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        dismissAlertCard();
        resolve();
      }, ms);
    });
  }

  /**
   * Shoutout video phase: hide when max time elapses OR TikTok embed reports playback ended (onStateChange 0).
   * @see https://developers.tiktok.com/doc/embed-player — Player to host: onStateChange, 0 = ended
   */
  function scheduleVideoPhaseDismiss(ms, embedUrl) {
    var useTikTokEnd =
      embedUrl && String(embedUrl).indexOf('tiktok.com/player/') >= 0;
    if (!useTikTokEnd) {
      return scheduleDismiss(ms);
    }
    return new Promise(function (resolve) {
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(hideTimer);
        window.removeEventListener('message', onTikTokHostMessage);
        dismissAlertCard();
        resolve();
      }
      function onTikTokHostMessage(ev) {
        try {
          if (!videoIframeEl || ev.source !== videoIframeEl.contentWindow) return;
          var d = ev.data;
          if (!d || d['x-tiktok-player'] !== true) return;
          if (d.type === 'onStateChange' && Number(d.value) === 0) {
            finish();
          }
        } catch (e) {}
      }
      window.addEventListener('message', onTikTokHostMessage);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(finish, ms);
    });
  }

  function showAlertAsync(payload) {
    stopActiveTtsOutput();
    var kind = payload.kind || 'new';
    var name = String(payload.tiktokUsername || '').trim() || 'Someone';
    var lang = (payload.languageCode && String(payload.languageCode).trim()) || 'en-US';
    var shout = payload.subscriberMessage && String(payload.subscriberMessage).trim();
    var ai = payload.announcementText && String(payload.announcementText).trim();

    var platformLabels = {
      tiktok: 'TikTok',
      youtube: 'YouTube',
      facebook: 'Facebook',
      x: 'X',
      twitch: 'Twitch',
      other: 'Social media'
    };
    var platKey = (payload.subscriberPlatform || 'tiktok').toLowerCase();
    var platLabel = platformLabels[platKey] || 'Social media';

    var shoutEmbed = '';
    if (
      (kind === 'shoutout' || kind === 'creator_reward') &&
      payload.shoutoutVideoEmbedUrl
    ) {
      shoutEmbed = String(payload.shoutoutVideoEmbedUrl).trim().slice(0, 512);
    }
    var hasShoutVideo =
      (kind === 'shoutout' || kind === 'creator_reward') && !!shoutEmbed;

    card.classList.remove(
      'kind-new',
      'kind-renewal',
      'kind-shoutout',
      'kind-coaching-booking',
      'kind-creator-reward',
      'shoutout-video-only',
      'video-plain',
    );
    if (kind === 'renewal') {
      card.classList.add('kind-renewal');
    } else if (kind === 'shoutout') {
      card.classList.add('kind-shoutout');
    } else if (kind === 'creator_reward') {
      card.classList.add('kind-creator-reward');
    } else if (kind === 'coaching_booking') {
      card.classList.add('kind-coaching-booking');
    } else {
      card.classList.add('kind-new');
    }

    var toSpeak = '';
    var buzzBannerLabel =
      kind === 'renewal'
        ? 'RESUB!'
        : kind === 'shoutout'
          ? 'SHOUTOUT!'
          : kind === 'creator_reward'
            ? (function () {
                var rb =
                  payload.creatorRewardBanner &&
                  String(payload.creatorRewardBanner).trim();
                return rb ? rb.slice(0, 40) : 'TIER!';
              })()
            : kind === 'coaching_booking'
              ? 'ACCOUNT REVIEW!'
              : 'NEW SUB!';

    if (kind === 'shoutout' || kind === 'creator_reward') {
      var shoutAmtRaw =
        payload.shoutoutAmountKes != null
          ? payload.shoutoutAmountKes
          : payload.donationAmountKes;
      var hasAmt =
        typeof shoutAmtRaw === 'number' && !isNaN(shoutAmtRaw);
      var amtRounded = hasAmt ? Math.round(shoutAmtRaw) : null;
      /* Spoken + on-screen: "Username from TikTok donated 100. Your message here." */
      var line = name + ' from ' + platLabel;
      if (hasAmt) {
        line += ' donated ' + amtRounded;
      }
      if (shout) {
        line += (hasAmt ? '. ' : ' — ') + shout;
      } else if (hasAmt) {
        line += '.';
      } else {
        line += '.';
      }
      if (kind === 'shoutout' && OBS_SHOUTOUT_TEMPLATE) {
        var customShout = templateLine(OBS_SHOUTOUT_TEMPLATE, {
          name: name,
          platform: platLabel,
          amount: hasAmt ? String(amtRounded) : '',
          message: shout || '',
          kind: kind,
        });
        if (customShout) line = customShout;
      }
      if (buzzTitleEl) buzzTitleEl.textContent = buzzBannerLabel;
      if (hasAmt) {
        if (buzzPrefixEl) buzzPrefixEl.textContent = '';
        if (buzzAmountBlockEl) buzzAmountBlockEl.classList.remove('buzz-hidden');
        if (buzzAmountEl) buzzAmountEl.textContent = String(amtRounded);
        if (buzzConnectorEl) buzzConnectorEl.textContent = 'FROM';
        if (buzzUsernameEl) buzzUsernameEl.textContent = name;
        if (buzzPlatformEl) buzzPlatformEl.textContent = '';
      } else {
        if (buzzPrefixEl) buzzPrefixEl.textContent = '';
        if (buzzAmountBlockEl) buzzAmountBlockEl.classList.add('buzz-hidden');
        if (buzzAmountEl) buzzAmountEl.textContent = '';
        if (buzzConnectorEl) buzzConnectorEl.textContent = '';
        if (buzzUsernameEl) buzzUsernameEl.textContent = name;
        if (buzzPlatformEl) buzzPlatformEl.textContent = ' · ' + platLabel.toUpperCase();
      }
      if (buzzSecondaryEl) buzzSecondaryEl.textContent = line;
      var crTts =
        kind === 'creator_reward' &&
        payload.creatorRewardTts &&
        String(payload.creatorRewardTts).trim();
      toSpeak = crTts
        ? String(payload.creatorRewardTts).trim().slice(0, 600)
        : line;
    } else if (kind === 'coaching_booking') {
      var coachAmt =
        payload.shoutoutAmountKes != null
          ? Math.round(Number(payload.shoutoutAmountKes))
          : 100;
      var acct =
        payload.coachingAccountUsername &&
        String(payload.coachingAccountUsername).trim();
      var coachSec = [];
      if (acct) coachSec.push('Game account: ' + acct);
      if (shout) coachSec.push(shout);
      if (buzzTitleEl) buzzTitleEl.textContent = buzzBannerLabel;
      if (buzzPrefixEl) buzzPrefixEl.textContent = '';
      if (buzzAmountBlockEl) buzzAmountBlockEl.classList.remove('buzz-hidden');
      if (buzzAmountEl) buzzAmountEl.textContent = String(coachAmt);
      if (buzzConnectorEl) buzzConnectorEl.textContent = 'FROM';
      if (buzzUsernameEl) buzzUsernameEl.textContent = name;
      if (buzzPlatformEl) buzzPlatformEl.textContent = '';
      if (buzzSecondaryEl) buzzSecondaryEl.textContent = coachSec.join('\\n\\n');
      toSpeak =
        'Account review booking paid for ' +
        name +
        '.' +
        (acct ? ' Game account: ' + acct + '.' : '') +
        (shout ? ' ' + shout : '');
    } else {
      var subPayRaw = payload.subscriptionAmountKes;
      var subPaidTts =
        typeof subPayRaw === 'number' && !isNaN(subPayRaw)
          ? ' Paid  ' + Math.round(subPayRaw) + ' for their subscription.'
          : '';
      var defaultSub;
      var ttsWelcome;
      if (kind === 'renewal') {
        defaultSub = name + ', welcome back to the MohaGamer community!';
        ttsWelcome = 'Resubscribed from ' + platLabel + '! ' + name + ', Halima says welcome back to the MohaGamer community!' + subPaidTts;
      } else {
        defaultSub = name + ', welcome to the MohaGamer community!';
        ttsWelcome = 'New subscriber from ' + platLabel + '! ' + name + ', Halima welcomes you to the MohaGamer community!' + subPaidTts;
      }
      if (OBS_SUBSCRIPTION_TEMPLATE) {
        var customSub = templateLine(OBS_SUBSCRIPTION_TEMPLATE, {
          name: name,
          platform: platLabel,
          amount:
            typeof subPayRaw === 'number' && !isNaN(subPayRaw)
              ? String(Math.round(subPayRaw))
              : '',
          message: shout || ai || '',
          kind: kind,
        });
        if (customSub) {
          defaultSub = customSub;
          ttsWelcome = customSub + subPaidTts;
        }
      }
      if (buzzTitleEl) buzzTitleEl.textContent = buzzBannerLabel;
      if (typeof subPayRaw === 'number' && !isNaN(subPayRaw)) {
        if (buzzPrefixEl) buzzPrefixEl.textContent = '';
        if (buzzAmountBlockEl) buzzAmountBlockEl.classList.remove('buzz-hidden');
        if (buzzAmountEl) buzzAmountEl.textContent = String(Math.round(subPayRaw));
        if (buzzConnectorEl) buzzConnectorEl.textContent = 'FROM';
        if (buzzUsernameEl) buzzUsernameEl.textContent = name;
        if (buzzPlatformEl) buzzPlatformEl.textContent = '';
      } else {
        if (buzzPrefixEl) {
          buzzPrefixEl.textContent =
            (kind === 'renewal' ? 'RESUB FROM ' : 'NEW SUB FROM ') +
            platLabel.toUpperCase();
        }
        if (buzzAmountBlockEl) buzzAmountBlockEl.classList.add('buzz-hidden');
        if (buzzAmountEl) buzzAmountEl.textContent = '';
        if (buzzConnectorEl) buzzConnectorEl.textContent = '';
        if (buzzUsernameEl) buzzUsernameEl.textContent = name;
        if (buzzPlatformEl) buzzPlatformEl.textContent = '';
      }
      if (buzzSecondaryEl) {
        if (shout) {
          buzzSecondaryEl.textContent = shout;
        } else if (ai) {
          buzzSecondaryEl.textContent = ai;
        } else {
          buzzSecondaryEl.textContent = defaultSub;
        }
      }

      if (shout) {
        toSpeak = ttsWelcome + ' ' + shout;
      } else if (ai) {
        toSpeak = ai + subPaidTts;
      } else {
        toSpeak = ttsWelcome;
      }
    }

    var hasVideoEmbed = !!(shoutEmbed && videoWrapEl && videoIframeEl);

    clearVideoPlayTimers();
    if (videoIframeEl) {
      videoIframeEl.onload = null;
      videoIframeEl.src = '';
    }
    if (videoWrapEl) {
      videoWrapEl.classList.add('hidden');
      videoWrapEl.setAttribute('aria-hidden', 'true');
    }

    card.classList.add('show');
    clearTimeout(hideTimer);
    var hideMs;
    if ((kind === 'shoutout' || kind === 'creator_reward') && shoutEmbed) {
      hideMs = HIDE_MS_SHOUTOUT_VIDEO;
    } else if (kind === 'shoutout' || kind === 'creator_reward') {
      hideMs = HIDE_MS_SHOUTOUT;
    } else if (kind === 'coaching_booking') {
      hideMs = HIDE_MS_SHOUTOUT;
    } else if (kind === 'renewal') {
      hideMs = HIDE_MS_RENEWAL;
    } else {
      hideMs = HIDE_MS_NEW;
    }

    function mountShoutVideo() {
      if (!hasVideoEmbed || !videoIframeEl || !videoWrapEl) return;
      clearVideoPlayTimers();
      videoIframeEl.onload = null;
      /* Show container before setting src — CEF/OBS often won't paint iframe while parent is display:none. */
      videoWrapEl.classList.remove('hidden');
      videoWrapEl.setAttribute('aria-hidden', 'false');
      if (shoutEmbed.indexOf('tiktok.com/player/') >= 0) {
        videoIframeEl.onload = function () {
          scheduleTikTokEmbedPlay();
        };
      }
      videoIframeEl.src = shoutEmbed;
    }

    function switchToVideoOnlyPhase() {
      if (!hasShoutVideo) return;
      card.classList.add('shoutout-video-only', 'video-plain');
      if (buzzTitleEl) buzzTitleEl.textContent = '';
      clearBuzzRow();
      if (buzzSecondaryEl) buzzSecondaryEl.textContent = '';
      mountShoutVideo();
    }

    /* With clip URL: first show shoutout text, then switch to plain video-only. */
    if (hasVideoEmbed) {
      if (kind === 'shoutout' || kind === 'creator_reward') {
        var phase1Ms = Math.max(2200, Math.min(4200, HIDE_MS_SHOUTOUT));
        return speakAlertPromise(toSpeak, lang).then(function () {
          return new Promise(function (resolvePhase) {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(function () {
              switchToVideoOnlyPhase();
              scheduleVideoPhaseDismiss(hideMs, shoutEmbed).then(resolvePhase);
            }, phase1Ms);
          });
        });
      }
      return speakAlertPromise(toSpeak, lang).then(function () {
        mountShoutVideo();
        return scheduleVideoPhaseDismiss(hideMs, shoutEmbed);
      });
    }
    if (!toSpeak || !String(toSpeak).trim()) {
      if (kind === 'shoutout' || kind === 'creator_reward') {
        toSpeak = name + ' from ' + platLabel + '.';
      } else if (kind === 'coaching_booking') {
        toSpeak = 'Account review booking paid by ' + name + '.';
      } else if (kind === 'renewal') {
        toSpeak = name + ', welcome back to the community!';
      } else {
        toSpeak = name + ', welcome to the community!';
      }
    }
    return Promise.all([scheduleDismiss(hideMs), speakAlertPromise(toSpeak, lang)]);
  }

  function enqueueAlert(payload) {
    alertQueue.push(payload);
    drainAlertQueue();
  }

  function drainAlertQueue() {
    if (alertProcessing) return;
    var next = alertQueue.shift();
    if (!next) return;
    alertProcessing = true;
    showAlertAsync(next)
      .catch(function (err) {
        console.warn('OBS alert error', err);
      })
      .then(function () {
        alertProcessing = false;
        drainAlertQueue();
      });
  }

  var streamUrl =
    window.location.origin +
    base +
    '/obs/alerts/stream?token=' +
    encodeURIComponent(token);
  if (uid) streamUrl += '&uid=' + encodeURIComponent(uid);
  var es = new EventSource(streamUrl);

  es.onopen = function () {
    var hint = cloudTtsConfigured ? 'Connected · Google TTS' : 'Connected · browser voice';
    if (ttsVoiceGoogle) hint += ' · ' + ttsVoiceGoogle;
    if (ttsVoiceBrowser) hint += ' · local: ' + ttsVoiceBrowser;
    setStatus(hint);
  };
  es.onerror = function () { setStatus('Reconnecting…'); };

  es.onmessage = function (ev) {
    try {
      var data = JSON.parse(ev.data);
      if (data.type === 'connected') return;
      if (data.tiktokUsername) enqueueAlert(data);
    } catch (e) {
      console.warn('Bad SSE payload', e);
    }
  };
})();
  </script>
</body>
</html>`;
  }
}
