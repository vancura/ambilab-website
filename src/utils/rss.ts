/**
 * Converts a content collection post ID to a blog post URL.
 * Expected format: "locale/slug.mdx" or "locale/slug.md"
 * Example: "en/hello-world.mdx" -> "/blog/hello-world"
 */
export function getBlogPostLink(postId: string): string {
  return `/blog/${postId.replace(/\.(mdx|md)$/, '').replace(/^[^/]+\//, '')}`;
}
