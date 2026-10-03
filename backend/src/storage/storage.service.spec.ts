import { extractStoredS3Key } from './storage.service';

describe('extractStoredS3Key', () => {
  it('returns object keys stored in the database', () => {
    expect(
      extractStoredS3Key('creators/abc/profile/avatar-1.jpg', 'makulutu'),
    ).toBe('creators/abc/profile/avatar-1.jpg');
  });

  it('extracts a key from a path-style S3 URL', () => {
    expect(
      extractStoredS3Key(
        'https://s3.eu-north-1.amazonaws.com/makulutu/users/fan1/profile/avatar-1.jpg',
        'makulutu',
      ),
    ).toBe('users/fan1/profile/avatar-1.jpg');
  });

  it('extracts a key from a signed S3 URL', () => {
    expect(
      extractStoredS3Key(
        'https://makulutu.s3.eu-north-1.amazonaws.com/creators/abc/profile/avatar-9.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=deadbeef',
        'makulutu',
      ),
    ).toBe('creators/abc/profile/avatar-9.jpg');
  });

  it('extracts a key from the media proxy path', () => {
    expect(
      extractStoredS3Key(
        '/media?key=creators%2Fabc%2Fprofile%2Favatar-9.jpg',
        'makulutu',
      ),
    ).toBe('creators/abc/profile/avatar-9.jpg');
  });

  it('leaves local upload paths and Google avatars alone', () => {
    expect(
      extractStoredS3Key('https://lh3.googleusercontent.com/a/x', 'makulutu'),
    ).toBeNull();
    expect(extractStoredS3Key('/uploads/creators/a/avatar.jpg', 'makulutu')).toBe(
      null,
    );
  });
});
