/**
 * Clean Script
 *
 * Removes build artifacts and cache directories.
 *
 * Usage:
 *   pnpm clean
 *   pnpm clean --all  (also removes node_modules)
 */

import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const DIRECTORIES_TO_CLEAN = ['dist', '.astro', '.wrangler', 'coverage', '.turbo'];

const ADDITIONAL_DIRECTORIES = ['node_modules', '.pnpm-store'];

function removeDirectory(name, rootDir) {
    const fullPath = join(rootDir, name);

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (existsSync(fullPath)) {
        console.log(`  Removing ${name}/...`);

        try {
            rmSync(fullPath, { recursive: true, force: true });
            console.log(`  Removed ${name}/`);
        } catch (error) {
            console.error(`  Failed to remove ${name}/: ${error.message}`);
        }
    } else {
        console.log(`  Skipping ${name}/ (not found)`);
    }
}

function main() {
    const cleanAll = process.argv.includes('--all');

    console.log('Cleaning build artifacts...\n');

    const directoriesToClean = cleanAll ? [...DIRECTORIES_TO_CLEAN, ...ADDITIONAL_DIRECTORIES] : DIRECTORIES_TO_CLEAN;

    for (const dir of directoriesToClean) {
        removeDirectory(dir, ROOT_DIR);
    }

    console.log('\nClean complete!');

    if (cleanAll) {
        console.log('\nRun "pnpm install" to restore dependencies.');
    }
}

main();
