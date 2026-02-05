/// <reference types="astro/client" />

import '@type/astro';

declare module '*?raw' {
    const content: string;
    export default content;
}

type ImportMetaEnv = object;

// biome-ignore lint/correctness/noUnusedVariables: Required by Astro for type augmentation
interface ImportMeta {
    readonly env: ImportMetaEnv;
}
