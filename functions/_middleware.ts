import type { PagesFunction } from '@cloudflare/workers-types';
import { generateNonce, applySecurityHeaders } from '../src/config/security';

type Env = {
  // Add any environment bindings here if needed
};

/**
 * NOTE: Code Duplication Required for Cloudflare Pages Runtime
 *
 * This middleware runs in Cloudflare Pages runtime, which has constraints that prevent
 * importing from the shared i18n utilities in `src/i18n/`. As a result, we must duplicate
 * the following logic here:
 * - domainLocaleMap
 * - defaultLocale
 * - getLocaleFromCookie
 * - detectLocaleFromHostname
 *
 * SECURITY HEADERS:
 * Security headers and nonce generation are now centralized in src/config/security.ts
 * and can be imported successfully in this Cloudflare Pages middleware.
 *
 * SYNCHRONIZATION REQUIREMENT:
 * When adding, removing, or modifying locales, you MUST update THREE locations:
 * 1. src/i18n/config.ts (source of truth)
 * 2. src/middleware.ts (Astro middleware - can import from i18n utils)
 * 3. functions/_middleware.ts (this file - Cloudflare Pages middleware)
 *
 * The validation logic in getLocaleFromCookie MUST match the locales array in
 * src/i18n/config.ts to prevent synchronization bugs.
 */

// IMPORTANT: Keep in sync with src/i18n/config.ts
const domainLocaleMap: Record<string, string> = {
  'ambilab.com': 'en',
  'ambilab.cz': 'cs',
  localhost: 'en',
  '127.0.0.1': 'en',
};

// IMPORTANT: Keep in sync with src/i18n/config.ts
const defaultLocale = 'en';

// IMPORTANT: Keep in sync with locales array in src/i18n/config.ts
// This validation logic mirrors isValidLocale() from src/i18n/config.ts
const validLocales = ['en', 'cs'] as const;

const isValidLocale = (locale: string): boolean => {
  return validLocales.includes(locale as (typeof validLocales)[number]);
};

const getLocaleFromCookie = (cookieString: string): string | null => {
  if (!cookieString) {
    return null;
  }

  const cookies = cookieString.split(';').map((c) => c.trim());
  const localeCookie = cookies.find((c) => c.startsWith('locale='));

  if (localeCookie) {
    const locale = localeCookie.split('=')[1]?.trim();
    // Use isValidLocale() instead of hard-coded check to align with src/i18n/utils.ts
    return locale && isValidLocale(locale) ? locale : null;
  }

  return null;
};

const detectLocaleFromHostname = (hostname: string): string => {
  const locale = domainLocaleMap[hostname];
  return locale || defaultLocale;
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Generate a cryptographically secure nonce for this request
  const nonce = generateNonce();

  // Check cookie first
  const cookieHeader = request.headers.get('Cookie') || '';
  let locale = getLocaleFromCookie(cookieHeader);

  // Fallback to hostname detection
  if (!locale) {
    locale = detectLocaleFromHostname(hostname);
  }

  // Ensure locale is always defined (fallback to defaultLocale)
  // This guarantees consistency with src/middleware.ts
  locale = locale || defaultLocale;

  // Create a new request with the x-locale and x-nonce headers
  // x-nonce will be used by Astro middleware to set context.locals.nonce
  const newHeaders = new Headers(request.headers);
  newHeaders.set('x-locale', locale);
  newHeaders.set('x-nonce', nonce);

  const newRequest = new Request(request, {
    headers: newHeaders,
  });

  // Get the response
  const response = await context.next(newRequest);

  // Add security headers to the response
  // Cloudflare Pages middleware only runs in production, so we use strict CSP
  const responseHeaders = new Headers(response.headers);
  applySecurityHeaders(responseHeaders, {
    nonce,
    isDev: false, // Cloudflare Pages middleware only runs in production
  });

  // Return response with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};
