<script lang="ts">
    import { getResponsiveSizes } from '@lib/images';
    import type { ImageMetadata } from 'astro';

    type Props =
        | {
              src: string;
              alt: string;
              width: number;
              height: number;
              sizes?: string;
              class?: string;
              loading?: 'lazy' | 'eager';
          }
        | {
              src: ImageMetadata;
              alt: string;
              width?: number;
              height?: number;
              sizes?: string;
              class?: string;
              loading?: 'lazy' | 'eager';
          };

    let { src, alt, sizes, class: className = '', width, height, loading = 'lazy' }: Props = $props();

    const responsiveSizes = $derived(getResponsiveSizes(sizes));
    const imageSrc = $derived(typeof src === 'string' ? src : src.src);
    const imageWidth = $derived(width ?? (typeof src === 'string' ? undefined : src.width));
    const imageHeight = $derived(height ?? (typeof src === 'string' ? undefined : src.height));
</script>

<img
    src={imageSrc}
    {alt}
    width={imageWidth}
    height={imageHeight}
    sizes={responsiveSizes}
    class="rounded-lg {className}"
    {loading}
/>
