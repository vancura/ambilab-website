#!/usr/bin/env node
/**
 * Synchronization validation script for i18n configuration.
 *
 * This script validates that locale configuration remains synchronized across:
 * - src/i18n/config.ts (source of truth)
 * - src/middleware.ts (Astro middleware)
 * - functions/_middleware.ts (Cloudflare Pages middleware)
 *
 * Run with: npx tsx src/scripts/validate-i18n-sync.ts
 *
 * LIMITATIONS:
 * This script uses regex-based extraction to parse configuration values from TypeScript files.
 * This approach is functional but fragile - any formatting changes to the source files could
 * break the extraction. This limitation exists because we cannot easily import TypeScript files
 * directly in a validation script without a full build/transpilation step.
 *
 * If the script becomes unreliable, consider these alternatives:
 * - Use TypeScript compiler API to parse the AST (more robust but heavier)
 * - Move locale config to a JSON file that both TypeScript and the validator can read
 * - Add more detailed error messages when regex fails to match (partially implemented)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ValidationResult {
  passed: boolean;
  errors: string[];
}

function extractValidLocales(content: string): string[] {
  // Extract locales array from config.ts: export const locales = ['en', 'cs'] as const;
  const localesMatch = content.match(/export const locales = \[(.*?)\]/s);
  if (!localesMatch) {
    const hasLocalesExport = content.includes('export const locales');
    const hasArraySyntax = content.includes('[') && content.includes(']');
    throw new Error(
      `Could not find locales array in config.ts. ` +
      `Found 'export const locales': ${hasLocalesExport}, ` +
      `Found array syntax: ${hasArraySyntax}. ` +
      `Expected format: export const locales = ['en', 'cs'] as const;`
    );
  }
  const localesStr = localesMatch[1];
  if (!localesStr) {
    throw new Error('Found locales array in config.ts but it appears to be empty');
  }
  return localesStr
    .split(',')
    .map((l) => l.trim().replace(/['"]/g, ''))
    .filter(Boolean);
}

function extractDefaultLocale(content: string): string {
  // Extract defaultLocale: export const defaultLocale: Locale = 'en';
  const match = content.match(/export const defaultLocale[^=]*=\s*['"]([^'"]+)['"]/);
  if (!match || !match[1]) {
    const hasDefaultLocaleExport = content.includes('export const defaultLocale');
    const hasAssignment = content.includes('defaultLocale') && content.includes('=');
    throw new Error(
      `Could not find defaultLocale in config.ts. ` +
      `Found 'export const defaultLocale': ${hasDefaultLocaleExport}, ` +
      `Found assignment operator: ${hasAssignment}. ` +
      `Expected format: export const defaultLocale: Locale = 'en';`
    );
  }
  return match[1];
}

function extractDomainLocaleMap(content: string): Record<string, string> {
  // Extract domainLocaleMap object
  const mapMatch = content.match(/export const domainLocaleMap[^=]*=\s*\{([^}]+)\}/s);
  if (!mapMatch) {
    const hasDomainLocaleMapExport = content.includes('export const domainLocaleMap');
    const hasObjectSyntax = content.includes('domainLocaleMap') && content.includes('{');
    throw new Error(
      `Could not find domainLocaleMap in config.ts. ` +
      `Found 'export const domainLocaleMap': ${hasDomainLocaleMapExport}, ` +
      `Found object syntax: ${hasObjectSyntax}. ` +
      `Expected format: export const domainLocaleMap = { 'example.com': 'en', ... };`
    );
  }
  const mapContent = mapMatch[1];
  if (!mapContent) {
    throw new Error('Found domainLocaleMap in config.ts but it appears to be empty');
  }
  const map: Record<string, string> = {};
  const entries = mapContent.match(/(['"][^'"]+['"]):\s*['"]([^'"]+)['"]/g) || [];
  if (entries.length === 0) {
    throw new Error(
      `Found domainLocaleMap in config.ts but could not parse any entries. ` +
      `Map content: ${mapContent.substring(0, 100)}...`
    );
  }
  for (const entry of entries) {
    const match = entry.match(/(['"])([^'"]+)\1:\s*['"]([^'"]+)['"]/);
    if (match?.[2] && match?.[3]) {
      map[match[2]] = match[3];
    }
  }
  return map;
}

function extractValidLocalesFromMiddleware(content: string): string[] {
  // Extract validLocales array: const validLocales = ['en', 'cs'] as const;
  const match = content.match(/const validLocales = \[(.*?)\]/s);
  if (!match) {
    const hasValidLocalesConst = content.includes('const validLocales');
    const hasArraySyntax = content.includes('validLocales') && content.includes('[');
    throw new Error(
      `Could not find validLocales array in middleware. ` +
      `Found 'const validLocales': ${hasValidLocalesConst}, ` +
      `Found array syntax: ${hasArraySyntax}. ` +
      `Expected format: const validLocales = ['en', 'cs'] as const;`
    );
  }
  const localesStr = match[1];
  if (!localesStr) {
    throw new Error('Found validLocales array in middleware but it appears to be empty');
  }
  return localesStr
    .split(',')
    .map((l) => l.trim().replace(/['"]/g, ''))
    .filter(Boolean);
}

function extractDefaultLocaleFromMiddleware(content: string): string {
  // Extract: const defaultLocale = 'en';
  const match = content.match(/const defaultLocale\s*=\s*['"]([^'"]+)['"]/);
  if (!match || !match[1]) {
    const hasDefaultLocaleConst = content.includes('const defaultLocale');
    const hasAssignment = content.includes('defaultLocale') && content.includes('=');
    throw new Error(
      `Could not find defaultLocale in middleware. ` +
      `Found 'const defaultLocale': ${hasDefaultLocaleConst}, ` +
      `Found assignment operator: ${hasAssignment}. ` +
      `Expected format: const defaultLocale = 'en';`
    );
  }
  return match[1];
}

function extractDomainLocaleMapFromMiddleware(content: string): Record<string, string> {
  // Extract domainLocaleMap object
  const mapMatch = content.match(/const domainLocaleMap[^:]*:\s*Record[^=]*=\s*\{([^}]+)\}/s);
  if (!mapMatch) {
    const hasDomainLocaleMapConst = content.includes('const domainLocaleMap');
    const hasObjectSyntax = content.includes('domainLocaleMap') && content.includes('{');
    throw new Error(
      `Could not find domainLocaleMap in middleware. ` +
      `Found 'const domainLocaleMap': ${hasDomainLocaleMapConst}, ` +
      `Found object syntax: ${hasObjectSyntax}. ` +
      `Expected format: const domainLocaleMap: Record<string, string> = { 'example.com': 'en', ... };`
    );
  }
  const mapContent = mapMatch[1];
  if (!mapContent) {
    throw new Error('Found domainLocaleMap in middleware but it appears to be empty');
  }
  const map: Record<string, string> = {};
  const entries = mapContent.match(/(['"][^'"]+['"]):\s*['"]([^'"]+)['"]/g) || [];
  if (entries.length === 0) {
    throw new Error(
      `Found domainLocaleMap in middleware but could not parse any entries. ` +
      `Map content: ${mapContent.substring(0, 100)}...`
    );
  }
  for (const entry of entries) {
    const match = entry.match(/(['"])([^'"]+)\1:\s*['"]([^'"]+)['"]/);
    if (match?.[2] && match?.[3]) {
      map[match[2]] = match[3];
    }
  }
  return map;
}

function validateSynchronization(): ValidationResult {
  const errors: string[] = [];
  const projectRoot = join(__dirname, '../..');

  try {
    // Read source of truth
    const configPath = join(projectRoot, 'src/i18n/config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    const sourceLocales = extractValidLocales(configContent);
    const sourceDefaultLocale = extractDefaultLocale(configContent);
    const sourceDomainMap = extractDomainLocaleMap(configContent);

    // Validate Astro middleware imports
    const astroMiddlewarePath = join(projectRoot, 'src/middleware.ts');
    const astroMiddlewareContent = readFileSync(astroMiddlewarePath, 'utf-8');

    // Check for required imports
    if (!astroMiddlewareContent.includes('from \'@i18n/config\'') && !astroMiddlewareContent.includes('from "@i18n/config"')) {
      errors.push('src/middleware.ts does not import from @i18n/config');
    }
    if (!astroMiddlewareContent.includes('from \'@i18n/utils\'') && !astroMiddlewareContent.includes('from "@i18n/utils"')) {
      errors.push('src/middleware.ts does not import from @i18n/utils');
    }

    // Check for hardcoded locale arrays (shouldn't exist)
    if (astroMiddlewareContent.match(/const\s+(validLocales|locales)\s*=/)) {
      errors.push('src/middleware.ts contains hardcoded locale definitions');
    }

    // Read Cloudflare Pages middleware
    const cfMiddlewarePath = join(projectRoot, 'functions/_middleware.ts');
    const cfMiddlewareContent = readFileSync(cfMiddlewarePath, 'utf-8');
    const cfLocales = extractValidLocalesFromMiddleware(cfMiddlewareContent);
    const cfDefaultLocale = extractDefaultLocaleFromMiddleware(cfMiddlewareContent);
    const cfDomainMap = extractDomainLocaleMapFromMiddleware(cfMiddlewareContent);

    // Validate locales array
    const sourceLocalesSorted = [...sourceLocales].sort().join(',');
    const cfLocalesSorted = [...cfLocales].sort().join(',');
    if (sourceLocalesSorted !== cfLocalesSorted) {
      errors.push(
        `Locales mismatch: config.ts has [${sourceLocales.join(', ')}], but _middleware.ts has [${cfLocales.join(', ')}]`
      );
    }

    // Validate defaultLocale
    if (sourceDefaultLocale !== cfDefaultLocale) {
      errors.push(
        `Default locale mismatch: config.ts has '${sourceDefaultLocale}', but _middleware.ts has '${cfDefaultLocale}'`
      );
    }

    // Validate domainLocaleMap
    const sourceDomains = Object.keys(sourceDomainMap).sort();
    const cfDomains = Object.keys(cfDomainMap).sort();
    const sourceDomainsStr = sourceDomains.join(',');
    const cfDomainsStr = cfDomains.join(',');

    if (sourceDomainsStr !== cfDomainsStr) {
      errors.push(
        `Domain keys mismatch: config.ts has [${sourceDomains.join(', ')}], but _middleware.ts has [${cfDomains.join(', ')}]`
      );
    }

    // Validate domain values
    for (const domain of sourceDomains) {
      if (sourceDomainMap[domain] !== cfDomainMap[domain]) {
        errors.push(
          `Domain '${domain}' locale mismatch: config.ts maps to '${sourceDomainMap[domain]}', but _middleware.ts maps to '${cfDomainMap[domain]}'`
        );
      }
    }

    // Check for extra domains in CF middleware
    for (const domain of cfDomains) {
      if (!sourceDomainMap[domain]) {
        errors.push(`Domain '${domain}' exists in _middleware.ts but not in config.ts`);
      }
    }
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

// Run validation
const result = validateSynchronization();

if (result.passed) {
  console.log('✅ i18n configuration is synchronized across all files');
  process.exit(0);
} else {
  console.error('❌ i18n configuration synchronization errors found:');
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  console.error('\nPlease update the affected files to maintain synchronization.');
  process.exit(1);
}

