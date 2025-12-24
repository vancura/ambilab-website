import { defineMiddleware } from 'astro:middleware';
import { defaultLocale } from '@i18n/config';
import { getLocaleFromCookie, detectLocaleFromHostname } from '@i18n/utils';
import { generateNonce, applySecurityHeaders } from '@config/security';

/**
 * Astro middleware for locale detection and security headers.
 *
 * This middleware uses shared utilities from @i18n/utils and @i18n/config,
 * ensuring consistency with the rest of the application.
 *
 * NOTE: When modifying locale detection logic, also check:
 * - functions/_middleware.ts (Cloudflare Pages middleware - has duplicated code)
 * - src/i18n/config.ts (source of truth for locale configuration)
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Generate nonce for production CSP
  // In development, we still generate it for consistency but don't enforce it in CSP
  // (Astro dev toolbar and Vite inject inline scripts/styles without nonces)
  const nonce = request.headers.get('x-nonce') || generateNonce();
  context.locals.nonce = nonce;

  // Check cookie first
  const cookieHeader = request.headers.get('Cookie') || '';
  let locale = getLocaleFromCookie(cookieHeader);

  // Fallback to hostname detection
  if (!locale) {
    locale = detectLocaleFromHostname(hostname);
  }

  // Ensure locale is always defined (fallback to defaultLocale)
  // This guarantees Locals.locale is always Locale, never undefined
  context.locals.locale = locale || defaultLocale;

  const response = await next();

  // Add security headers to the response
  // IMPORTANT: When nonces are present in CSP, 'unsafe-inline' is IGNORED by browsers.
  // Therefore, in development (where Astro dev toolbar and Vite inject scripts/styles
  // without our nonce), we use 'unsafe-inline' WITHOUT nonces.
  // In production, we use strict nonce-based CSP.
  applySecurityHeaders(response.headers, {
    nonce,
    isDev: import.meta.env.DEV,
  });

  return response;
});
