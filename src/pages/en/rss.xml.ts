import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '@config/site';
import type { APIContext } from 'astro';
import { getBlogPostLink } from '@utils/rss';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => !data.draft && data.locale === 'en');

  const sortedPosts = posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const recentPosts = sortedPosts.slice(0, 20); // Limit to 20 most recent posts

  return rss({
    title: `${SITE.NAME} - English`,
    description: SITE.DESCRIPTION,
    site: context.site?.toString() || SITE.URL,
    items: recentPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: getBlogPostLink(post.id),
      categories: post.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
