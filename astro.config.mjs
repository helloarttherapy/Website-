import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.annaworthingtonarttherapy.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap({filter: page => !page.endsWith('/404')})],
});
