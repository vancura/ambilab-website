/**
 * Locale Type Definitions.
 *
 * TypeScript types and interfaces for locale handling, including
 * locale codes and configuration objects.
 */

/**
 * Supported locale codes.
 */
export type Locale = 'en' | 'cs';

/**
 * Configuration object for a locale.
 */
export interface LocaleConfig {
    /**
     * The locale code identifier (e.g., 'en', 'cs').
     */
    code: Locale;

    /**
     * The display name of the locale (e.g., 'English', 'Čeština').
     */
    name: string;
}
