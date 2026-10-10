import { load } from 'cheerio';

// Change the structure of the migrated HTML without editing its words.
function fragment(html) {
  const $ = load(html, null, false);
  $('p').each((_, element) => {
    const paragraph = $(element);
    const chunks = paragraph.html().split(/(?:<br>\s*){2,}/);
    if (chunks.length < 2) return;
    paragraph.replaceWith(chunks.map(chunk => {
      const content = chunk.replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g, '');
      return load(content, null, false).text().trim() ? `<p>${content}</p>` : '';
    }).join(''));
  });
  return $;
}

export function sessionLayout(html) {
  const $ = fragment(html);
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

export function supportLayout(html) {
  const $ = load(html, null, false), groups = [];
  let group;
  $.root().children().each((_, element) => {
    if (['h2', 'h3'].includes(element.tagName)) {
      group = { heading: $.html(element), body: '' };
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

export function readableArticle(html) {
  const $ = fragment(html);
  $('img').first().attr('loading', 'eager').attr('fetchpriority', 'high');
  return $.html();
}
