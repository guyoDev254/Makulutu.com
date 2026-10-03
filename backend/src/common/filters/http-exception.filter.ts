import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** Chrome/Cursor/devtools probe the API as if it were a Chrome debugger. */
function isDevtoolsProbe(method: string, url: string): boolean {
  if (method !== 'GET') return false;
  const path = (url || '').split('?')[0];
  return (
    path === '/json' ||
    path === '/json/version' ||
    path === '/json/list' ||
    path === '/json/protocol'
  );
}

/** Accidental static-file hits on /creator-auth/public/:slug (e.g. sw.js). */
function isStaticAssetPublicSlug(method: string, url: string): boolean {
  if (method !== 'GET') return false;
  const path = (url || '').split('?')[0];
  const m = path.match(/^\/creator-auth\/public\/([^/]+)$/);
  if (!m) return false;
  try {
    const slug = decodeURIComponent(m[1]).toLowerCase();
    return slug.includes('.');
  } catch {
    return true;
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (
      !(
        status === 404 &&
        (isDevtoolsProbe(request.method, request.url) ||
          isStaticAssetPublicSlug(request.method, request.url))
      )
    ) {
      this.logger.warn(`${request.method} ${request.url} - ${status}`);
    }

    const clientMessage =
      typeof message === 'string'
        ? message
        : (message as { message?: unknown })?.message || 'An error occurred';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: clientMessage,
    });
  }
}
