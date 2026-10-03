import { ConfigService } from '@nestjs/config';
import { GoogleTokenService } from './google-token.service';

describe('GoogleTokenService', () => {
  it('collects configured Google client IDs', () => {
    const config = {
      get: (key: string) => {
        if (key === 'GOOGLE_WEB_CLIENT_ID') return ' web.apps.googleusercontent.com ';
        if (key === 'GOOGLE_IOS_CLIENT_ID') return '';
        if (key === 'GOOGLE_ANDROID_CLIENT_ID') return 'android.apps.googleusercontent.com';
        return undefined;
      },
    } as ConfigService;
    const service = new GoogleTokenService(config);
    expect(service.isConfigured()).toBe(true);
    expect(service.audiences()).toEqual([
      'web.apps.googleusercontent.com',
      'android.apps.googleusercontent.com',
    ]);
  });

  it('is unconfigured when no client IDs are set', () => {
    const config = { get: () => undefined } as unknown as ConfigService;
    const service = new GoogleTokenService(config);
    expect(service.isConfigured()).toBe(false);
    expect(service.audiences()).toEqual([]);
  });
});
