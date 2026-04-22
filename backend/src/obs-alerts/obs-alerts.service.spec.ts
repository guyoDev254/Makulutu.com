import { ObsAlertsService } from './obs-alerts.service';

describe('ObsAlertsService tenant isolation', () => {
  const makeService = () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'OBS_ALERT_SECRET') return 'shared-secret';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    } as any;

    const prisma = {
      obsStreamLink: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;

    const groq = {
      isConfigured: jest.fn().mockReturnValue(false),
      generateSubscriberAnnouncement: jest.fn(),
    } as any;

    const gemini = {
      isConfigured: jest.fn().mockReturnValue(false),
      generateSubscriberAnnouncement: jest.fn(),
    } as any;

    const service = new ObsAlertsService(config, prisma, groq, gemini);
    return { service, prisma };
  };

  it('accepts creator token only when token belongs to uid', async () => {
    const { service, prisma } = makeService();
    prisma.obsStreamLink.findFirst.mockResolvedValueOnce({ id: 'link-1' });

    const ok = await service.validateToken('creator-token-a', 'creator-a');

    expect(ok).toBe(true);
    expect(prisma.obsStreamLink.findFirst).toHaveBeenCalledWith({
      where: { token: 'creator-token-a', revokedAt: null, creatorId: 'creator-a' },
      select: { id: true },
    });
  });

  it('rejects creator token when uid does not own token', async () => {
    const { service, prisma } = makeService();
    prisma.obsStreamLink.findFirst.mockResolvedValueOnce(null);

    const ok = await service.validateToken('creator-token-a', 'creator-b');

    expect(ok).toBe(false);
  });

  it('still accepts shared secret for legacy unscoped flow', async () => {
    const { service } = makeService();

    const ok = await service.validateToken('shared-secret');

    expect(ok).toBe(true);
  });

  it('emits scoped alerts only to matching creator and global clients', async () => {
    const { service } = makeService();
    const sendA = jest.fn();
    const sendB = jest.fn();
    const sendGlobal = jest.fn();

    service.subscribe(sendA, 'creator-a');
    service.subscribe(sendB, 'creator-b');
    service.subscribe(sendGlobal, null);

    await service.emitSubscriberAlert(
      {
        kind: 'new',
        tiktokUsername: 'ScopedUser',
        creatorId: 'creator-a',
        skipGemini: true,
      },
      { requireEnabled: false },
    );

    expect(sendA).toHaveBeenCalledTimes(1);
    expect(sendB).not.toHaveBeenCalled();
    expect(sendGlobal).toHaveBeenCalledTimes(1);
  });
});
