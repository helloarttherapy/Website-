import { load } from 'cheerio';
import podcastEpisodes from '../data/podcast-episodes.json' with { type: 'json' };

// Change the structure of the migrated HTML without editing its words.
function fragment(html) {
  const $ = load(html, null, false);
  $('p').each((_, element) => {
    const paragraph = $(element);
    const chunks = paragraph.html().split(/(?:<br>\s*){2,}/);
    if (chunks.length < 2) return;
    paragraph.replaceWith(chunks.map(chunk => {
      const content = chunk.replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g, '');
      const fragment = load(content, null, false);
      return fragment.text().trim() || fragment('img,iframe,video,audio,picture').length ? `<p>${content}</p>` : '';
    }).join(''));
  });
  return $;
}

export function sessionLayout(html) {
  const $ = fragment(html);
  $('h2').first().find('br').replaceWith(' ');
  const labels = ['Individual sessions', 'Parent/child sessions', 'Group work', 'Session pricing'];
  $('p').each((_, element) => {
    const p = $(element), first = p.find('strong').first();
    const title = first.text().trim();
    if (!labels.includes(title)) return;
    first.remove();
    p.find('br').first().remove();
    p.before($('<h3>').text(title));
    if (!p.text().trim()) p.remove();
  });
  const intro = [], groups = [];
  let group;
  $.root().children().each((_, element) => {
    if (element.tagName === 'h3') {
      group = { title: $(element).text(), body: '' };
      groups.push(group);
    } else if (group) group.body += $.html(element);
    else intro.push($.html(element));
  });
  return { intro: intro.join(''), groups };
}

// Squarespace often exports paragraph boundaries as line breaks inside one p.
// Return the first non-empty opening block, keeping its original words.
export function articleIntro(html) {
  const $ = load(html, null, false);
  $('figure,figcaption,script,style,iframe').remove();
  for (const paragraph of $('p').toArray()) {
    for (const block of ($(paragraph).html() || '').split(/<br\s*\/?\s*>/i)) {
      const text = load(block, null, false).text().replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
  }
  return '';
}

export function supportLayout(html) {
  const $ = load(html, null, false), groups = [];
  let group;
  $.root().children().each((_, element) => {
    if (['h2', 'h3'].includes(element.tagName)) {
      group = { heading: $('<h2>').html($(element).html()).toString(), body: '' };
      groups.push(group);
    } else if (group) group.body += $.html(element);
  });
  return groups.map(group => `<div class="support-panel">${group.heading}<div class="support-list">${group.body}</div></div>`).join('');
}

export function aboutLayout(html) {
  const $ = fragment(html), intro = [], sections = [];
  $('figure img').first().attr('loading', 'eager').attr('fetchpriority', 'high').attr('alt', 'Anna Worthington');
  const portrait = $('figure').first().toString();
  $('figure').first().remove();
  let section;
  $.root().children().each((_, element) => {
    if (element.tagName === 'h3') {
      section = { title: $(element).text(), body: '' };
      sections.push(section);
    } else if (section) section.body += $.html(element);
    else intro.push($.html(element));
  });
  return { portrait, intro: intro.join(''), sections };
}

export function readableArticle(html, { eagerImage = true, includePodcastLinks = true } = {}) {
  const $ = fragment(html);
  if (eagerImage) $('img').first().attr('loading', 'eager').attr('fetchpriority', 'high');
  const originalPlayer = $('iframe[src*="podcasters.spotify.com"]').first().attr('src');
  const episode = Object.values(podcastEpisodes).find(episode => episode.originalPlayer === originalPlayer);
  if (episode) {
    const episodeUrl = `https://open.spotify.com/episode/${episode.spotifyId}`;
    $('iframe[src*="podcasters.spotify.com"]').attr('src', `https://open.spotify.com/embed/episode/${episode.spotifyId}`).attr('height', '152');
    // Some original captions pointed at a different article's episode.
    $('a[href*="podcasters.spotify.com"]').attr('href', episodeUrl);
  }
  if (includePodcastLinks) {
    const links = $('<nav>').attr('class', 'episode-links').attr('aria-label', episode ? 'Listen or watch this episode' : 'Hello Art Therapy podcast and videos');
    links.append($('<a>').attr('href', episode ? `https://open.spotify.com/episode/${episode.spotifyId}` : 'https://open.spotify.com/show/2HYK9V80ALHtTqfCFbb2lt').text(episode ? 'Listen on Spotify' : 'Spotify podcast'));
    links.append($('<a>').attr('href', episode ? `https://www.youtube.com/watch?v=${episode.youtubeId}` : 'https://www.youtube.com/channel/UCO7ijN4udMnVMYP2G2Cgp-A').text(episode ? 'Watch on YouTube' : 'YouTube channel'));
    $.root().prepend(links);
  }
  return $.html();
}

export function therapyLayout(html) {
  const $ = fragment(html);
  $('img').first().attr('loading', 'eager').attr('fetchpriority', 'high');
  $('a').filter((_, element) => !$(element).text().trim() && !$(element).find('img').length).remove();
  const lead = [], opening = [], sections = [];
  let section;
  let introduction = true;
  $.root().children().each((_, element) => {
    const node = $(element);
    // Preserve the original image, greeting and reading order as one opening row.
    if (introduction && (element.tagName === 'figure' || element.tagName === 'p')) {
      lead.push($.html(element));
      if (node.text().trim() === 'Let’s take a brief look at why I think that’s an important question.') introduction = false;
      return;
    }
    const strong = node.children('strong');
    if (element.tagName === 'p' && strong.text().trim() === 'Do you make art?') {
      // Keep the preceding sentence in place, then start the existing final question.
      const title = strong.text().trim();
      strong.remove();
      if (section) section.body += $.html(element);
      section = { title, body: '' };
      sections.push(section);
      return;
    }
    if (element.tagName === 'p' && strong.length === 1 && node.text().trim() === strong.text().trim()) {
      section = { title: strong.text().trim(), body: '' };
      sections.push(section);
    } else if (section) section.body += $.html(element);
    else opening.push($.html(element));
  });
  const leadHtml = load(lead.join(''), null, false);
  const figure = leadHtml('figure').toString();
  leadHtml('figure').remove();
  return { figure, introduction: leadHtml.html(), opening: opening.join(''), sections };
}

export function linkedHeading(html, href) {
  const $ = load(html, null, false);
  const heading = $('h2').first();
  heading.html($('<a>').attr('href', href).attr('class', 'section-link').html(heading.html()));
  // The source's long h3 statements are paragraphs, with their approved type preserved.
  $('h3').each((_, element) => $(element).replaceWith($('<p>').attr('class', 'intro-statement').html($(element).html())));
  return $.html();
}
