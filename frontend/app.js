// tdarius.dev – loads profile.json and projects.json, builds one full-screen section
// per project (plus an intro and a contact section) and handles demo cycling,
// video playback and navigation.
(() => {
  'use strict';

  const DEMO_CYCLE_INTERVAL = 3500; // ms between the demos of one project
  const NAV_HIDE_DELAY = 1500;      // ms until the dot navigation hides again on small screens

  const container = document.getElementById('projects');
  const nav = document.getElementById('progress-bar');
  const status = document.getElementById('status');
  const header = document.querySelector('.site-header'); // starts hidden, see index.html

  async function fetchJSON(url, retries = 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      return await response.json();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
      return fetchJSON(url, retries - 1); // one retry covers flaky connections
    }
  }

  // Lenient readers for the JSON files: anything of the wrong shape becomes "nothing".
  const list = (value) => (Array.isArray(value) ? value : []);
  const objects = (value) => list(value).filter((item) => item && typeof item === 'object');
  const text = (value) => (typeof value === 'string' ? value.trim() : '');
  const SLUG = /^[a-z0-9][a-z0-9_-]*$/i; // folder name, section id and URL hash
  const RESERVED_SLUGS = ['intro', 'contact'];

  // Turn a raw config.json into the shape the renderer needs.
  function normalizeProject(slug, config, fallbackColor) {
    if (!config || typeof config !== 'object') throw new Error('config.json is not an object');
    const title = text(config.title) || slug;
    // a hosted file ("url") or one in the project folder ("file")
    const source = (url, file) => text(url) || (text(file) ? `projects/${slug}/${text(file)}` : null);
    const demos = objects(config.demos)
      .map((demo) => ({
        type: demo.type === 'video' ? 'video' : 'image',
        src: source(demo.url, demo.file),
        poster: demo.type === 'video' ? source(demo.posterUrl, demo.poster) : null,
        fit: demo.fit === 'contain' ? 'contain' : 'cover',
        background: text(demo.background) || null,
        alt: text(demo.alt) || `${title} demo`,
      }))
      .filter((demo) => demo.src);

    return {
      slug,
      title,
      context: text(config.context),
      period: text(config.period),
      abstract: text(config.abstract),
      highlight: text(config.highlight),
      tags: list(config.tags).map(text).filter(Boolean),
      github: text(config.urls?.github) || null,
      demo: text(config.urls?.demo) || null,
      paper: text(config.urls?.paper) || null,
      color: text(config.color) || fallbackColor,
      demos,
    };
  }

  async function loadProjects() {
    const index = await fetchJSON('projects.json');
    const slugs = [];
    list(index?.projects).forEach((slug) => {
      if (!SLUG.test(text(slug)) || RESERVED_SLUGS.includes(slug)) console.error(`Ignoring invalid project slug "${slug}"`);
      else if (slugs.includes(slug)) console.error(`Ignoring duplicate project slug "${slug}"`);
      else slugs.push(slug);
    });
    const palette = list(index?.palette).map(text).filter(Boolean);
    if (!palette.length) palette.push('#f3f4f6');

    const projects = await Promise.all(slugs.map(async (slug, i) => {
      try {
        const config = await fetchJSON(`projects/${slug}/config.json`);
        return normalizeProject(slug, config, palette[(i + 1) % palette.length]); // palette[0] is the intro's
      } catch (error) {
        console.error(`Skipping project "${slug}":`, error);
        return null;
      }
    }));
    return { projects: projects.filter(Boolean), palette };
  }

  // ---------- DOM helpers ----------

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function link(href, label, className, external = true) {
    const anchor = el('a', className, label);
    anchor.href = href;
    if (external && !href.startsWith('#') && !href.startsWith('mailto:')) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    return anchor;
  }

  function section(id, className, label, color) {
    const node = el('section', `project ${className}`.trim());
    node.id = id;
    node.setAttribute('aria-label', label);
    node.tabIndex = -1; // focusable by script only, see goTo()
    node.style.setProperty('--project-bg', color);
    return node;
  }

  // The abstract starts with one plain-language sentence (see README). Phones show
  // only that sentence until the "More" button is tapped, so the lead and the rest
  // are separate spans. The split is the first . ? or ! followed by a capital
  // letter, which skips abbreviations such as "et al. (2024)".
  function createAbstract(abstract) {
    const node = el('p', 'project-abstract');
    const match = abstract.match(/^([\s\S]*?[.?!])\s+(?=[A-Z])/);
    const lead = match ? match[1] : abstract;
    const rest = match ? abstract.slice(match[0].length) : '';
    if (!rest) {
      node.textContent = lead;
      return node;
    }
    node.classList.add('collapsible');
    node.append(el('span', 'abstract-lead', lead), el('span', 'abstract-rest', ` ${rest}`), ' ');
    const toggle = el('button', 'abstract-toggle', 'More');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const expanded = node.classList.toggle('expanded');
      toggle.textContent = expanded ? 'Less' : 'More';
      toggle.setAttribute('aria-expanded', String(expanded));
    });
    node.append(toggle);
    return node;
  }

  // A row of pill links from [{label, url}], skipping entries without a url.
  // The arrow marks links that leave the page, including the mailto.
  function linkRow(links, className) {
    const row = el('p', 'project-links');
    links.forEach(({ label, url }) => {
      if (text(url) && text(label)) row.append(link(url, `${label} ↗`, className));
    });
    return row;
  }

  // One slide per demo: the media plus, for "contain" images without a background
  // colour, a blurred copy of the image filling the frame behind it.
  function createDemo(demo, isActive) {
    const slide = el('div', `demo-slide${isActive ? ' active' : ''}`);
    if (demo.type === 'image' && demo.fit === 'contain' && !demo.background) {
      const backdrop = document.createElement('img');
      backdrop.className = 'demo-backdrop';
      backdrop.alt = '';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.decoding = 'async';
      backdrop.loading = 'lazy';
      backdrop.src = demo.src;
      slide.append(backdrop);
    }
    slide.append(createMedia(demo));
    return slide;
  }

  function createMedia(demo) {
    let media;
    if (demo.type === 'video') {
      media = document.createElement('video');
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.preload = 'none';
      media.setAttribute('aria-label', demo.alt);
      if (demo.poster) media.poster = demo.poster; // shown until the video plays, or instead of it if it cannot
      media.dataset.src = demo.src; // attached on first play, see attachSource()
    } else {
      media = document.createElement('img');
      media.alt = demo.alt;
      media.decoding = 'async';
      media.loading = 'lazy';
      media.src = demo.src;
    }
    media.className = `demo-media fit-${demo.fit}`;
    if (demo.background) media.style.background = demo.background;
    return media;
  }

  // ---------- sections ----------

  function createIntro(profile, projects, color) {
    const node = section('intro', 'intro', 'Introduction', color);
    // Each block sits in a "screen" wrapper: invisible on desktop, one centred
    // full-height slide each on phones (see style.css).
    const screen = (name, ...blocks) => { const wrapper = el('div', `intro-screen screen-${name}`); wrapper.append(...blocks); return wrapper; };
    const main = el('div', 'text-field intro-main');
    const intro = el('div', 'text-field intro-text');
    main.append(screen('text', intro));

    if (profile.name) intro.append(el('h2', 'project-title intro-name', profile.name));
    if (profile.tagline) intro.append(el('p', 'intro-tagline', profile.tagline));
    if (profile.bio) intro.append(el('p', 'project-abstract', profile.bio));
    if (profile.status) intro.append(el('p', 'project-highlight', profile.status));
    if (profile.location) intro.append(el('p', 'project-meta', profile.location));

    const links = linkRow(profile.links, 'button');
    if (links.childElementCount) intro.append(links);

    // Publications and awards share one phone screen; on desktop the grid places
    // the two cards by their grid areas, wherever they sit in the DOM.
    const credentials = [];
    if (profile.publications.length || profile.publicationsNote) {
      const block = el('div', 'intro-publications');
      block.append(el('h3', 'intro-heading', 'Publications'));
      const ol = el('ol', 'publication-list');
      profile.publications.forEach((pub) => {
        const li = el('li', 'publication');
        li.append(el('span', 'publication-title', pub.title));
        if (pub.authors) li.append(el('span', 'publication-authors', pub.authors));
        if (pub.venue) li.append(el('span', 'publication-venue', pub.venue));
        const pubLinks = el('span', 'publication-links');
        pub.links.forEach(({ label, url }) => { if (url && label) pubLinks.append(link(url, `${label} ↗`, 'text-link')); });
        if (pubLinks.childElementCount) li.append(pubLinks);
        ol.append(li);
      });
      if (ol.childElementCount) block.append(ol);
      if (profile.publicationsNote) block.append(el('p', 'publication-note', profile.publicationsNote));
      credentials.push(block);
    }
    if (profile.awards.length) {
      const awards = el('div', 'intro-awards');
      awards.append(el('h3', 'intro-heading', 'Awards'));
      const ul = el('ul', 'award-list');
      profile.awards.forEach((award) => {
        const li = el('li');
        li.append(el('span', 'publication-title', award.title));
        if (award.note) li.append(el('span', 'index-meta', award.note));
        ul.append(li);
      });
      awards.append(ul);
      credentials.push(awards);
    }
    if (credentials.length) main.append(screen('publications', ...credentials));

    // Project index: lets a reader see everything at a glance and jump directly
    const index = el('nav', 'intro-index');
    index.setAttribute('aria-label', 'Project index');
    index.append(el('h3', 'intro-heading', 'Projects'));
    const ol = el('ol', 'index-list');
    projects.forEach((project) => {
      const li = el('li');
      li.append(link(`#${project.slug}`, project.title, 'index-link', false));
      // context plus the year(s) only; the full period is on the card
      const years = [...new Set(project.period.match(/\d{4}/g) || [])].join(' – ');
      const meta = [project.context, years].filter(Boolean).join(' · ');
      if (meta) li.append(el('span', 'index-meta', meta));
      ol.append(li);
    });
    index.append(ol);

    const aside = el('div', 'intro-aside');
    aside.append(screen('index', index));

    const content = el('div', 'project-content');
    content.append(main, aside);
    node.append(content);
    return node;
  }

  function createProject(project) {
    const node = section(project.slug, '', project.title, project.color);

    const textField = el('div', 'text-field');
    textField.append(el('h2', 'project-title', project.title));

    // "Context · Period"
    const meta = el('p', 'project-meta');
    if (project.context) meta.append(el('span', '', project.context));
    if (project.period) meta.append(el('span', '', project.period));
    if (meta.childElementCount) textField.append(meta);

    if (project.abstract) textField.append(createAbstract(project.abstract));
    if (project.highlight) textField.append(el('p', 'project-highlight', project.highlight));
    if (project.tags.length) {
      const tags = el('ul', 'project-tags');
      tags.setAttribute('aria-label', 'Technologies');
      project.tags.forEach((tag) => tags.append(el('li', 'tag', tag)));
      textField.append(tags);
    }
    const links = linkRow([
      { label: 'GitHub', url: project.github },
      { label: 'Live demo', url: project.demo },
      { label: 'Paper', url: project.paper },
    ], 'button');
    if (links.childElementCount) textField.append(links);

    // The demo itself links to the live demo if there is one, otherwise to the repo.
    const primaryUrl = project.demo || project.github;
    const demoField = primaryUrl ? link(primaryUrl, '', 'demo-field') : el('div', 'demo-field');
    if (primaryUrl) demoField.setAttribute('aria-label', `Open ${project.title}`);
    const demoBox = el('div', 'demo-container');
    const media = project.demos.map((demo, i) => createDemo(demo, i === 0));
    if (media.length) demoBox.append(...media);
    else demoBox.append(el('div', 'demo-placeholder', project.demo ? 'Open the live demo' : primaryUrl ? 'Open on GitHub' : 'No demo available'));
    demoField.append(demoBox);

    const content = el('div', 'project-content');
    content.append(textField, demoField);
    node.append(content);
    return { node, media };
  }

  function createContact(profile, color) {
    const node = section('contact', 'contact', 'Contact', color);
    const main = el('div', 'text-field contact-main');
    main.append(el('h2', 'project-title', 'Get in touch'));
    if (profile.contactText) main.append(el('p', 'project-abstract', profile.contactText));
    const links = linkRow(profile.links, 'button');
    if (links.childElementCount) main.append(links);

    // Secondary information lives in a footer block pinned to the bottom of the slide.
    const footer = el('footer', 'site-footer');
    if (profile.earlierWork.length) {
      const p = el('p', 'earlier-work');
      p.append('Earlier work includes ');
      profile.earlierWork.forEach((item, i, all) => {
        if (i > 0) p.append(i === all.length - 1 ? ' and ' : ', ');
        p.append(item.url ? link(item.url, item.title, 'text-link') : item.title);
      });
      if (profile.github) {
        p.append(', plus more on ');
        p.append(link(profile.github, 'GitHub', 'text-link'));
      }
      p.append('.');
      footer.append(p);
    }
    // two unbreakable parts, so a narrow screen wraps to "name" / "the rest", never mid-phrase
    const colophon = el('p', 'colophon');
    const rest = el('span', '', 'plain HTML, CSS and JavaScript · ');
    rest.append(link('https://github.com/tjayada/tdarius.dev', 'source', 'text-link'));
    colophon.append(el('span', '', ['©', new Date().getFullYear(), profile.name].filter(Boolean).join(' ')), rest);
    footer.append(colophon);

    const content = el('div', 'project-content');
    content.append(main);
    node.append(content, footer);
    return node;
  }

  // ---------- playback and cycling ----------

  function attachSource(video) {
    if (!video.dataset.src) return;
    video.src = video.dataset.src;
    delete video.dataset.src;
    video.preload = 'auto';
  }

  const videoOf = (slide) => slide.querySelector('video');

  function pause(slide) {
    videoOf(slide)?.pause();
  }

  function play(slide) {
    const video = videoOf(slide);
    if (!video) return;
    attachSource(video);
    // The promise also rejects when a scroll pauses the video before it started;
    // if autoplay is refused for good (e.g. iOS Low Power Mode) the poster stays.
    video.play().catch(() => {});
  }

  function showDemo(state, index) {
    const previous = state.media[state.index];
    previous.classList.remove('active');
    pause(previous);
    state.index = index;
    const next = state.media[index];
    next.classList.add('active');
    if (state.active) play(next);
  }

  function activate(state) {
    if (state.active) return;
    state.active = true;
    if (state.media.length) play(state.media[state.index]);
    if (state.media.length > 1) {
      state.timer = setInterval(() => showDemo(state, (state.index + 1) % state.media.length), DEMO_CYCLE_INTERVAL);
    }
  }

  function deactivate(state) {
    if (!state.active) return;
    state.active = false;
    clearInterval(state.timer);
    state.timer = null;
    state.media.forEach(pause);
  }

  // ---------- page setup ----------

  function normalizeProfile(raw) {
    if (!raw || typeof raw !== 'object') raw = {};
    const pairs = (items) => objects(items).map((item) => ({ label: text(item.label), url: text(item.url) }));
    const links = pairs(raw.links);
    return {
      name: text(raw.name),
      tagline: text(raw.tagline),
      bio: text(raw.bio),
      status: text(raw.status),
      location: text(raw.location),
      contactText: text(raw.contactText),
      links,
      publications: objects(raw.publications).map((pub) => ({
        title: text(pub.title), authors: text(pub.authors), venue: text(pub.venue), links: pairs(pub.links),
      })).filter((pub) => pub.title),
      publicationsNote: text(raw.publicationsNote),
      awards: objects(raw.awards).map((item) => ({ title: text(item.title), note: text(item.note) })).filter((item) => item.title),
      earlierWork: objects(raw.earlierWork).map((item) => ({ title: text(item.title), url: text(item.url) })).filter((item) => item.title),
      github: links.find((item) => item.label.toLowerCase() === 'github')?.url || null,
    };
  }

  async function init() {
    let projects;
    let palette;
    let profile;
    try {
      [{ projects, palette }, profile] = await Promise.all([
        loadProjects(),
        fetchJSON('profile.json').then(normalizeProfile).catch((error) => { console.error(error); return normalizeProfile({}); }),
      ]);
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not load the project list. Please try again later.';
      return;
    }
    if (!projects.length) {
      status.textContent = 'No projects found.';
      return;
    }

    // One entry per section: intro, the projects, contact
    const entries = [
      { slug: 'intro', title: 'Introduction', node: createIntro(profile, projects, palette[0]), media: [] },
      ...projects.map((project) => {
        const { node, media } = createProject(project);
        return { slug: project.slug, title: project.title, node, media };
      }),
      { slug: 'contact', title: 'Contact', node: createContact(profile, palette[(projects.length + 1) % palette.length]), media: [] },
    ];

    const states = entries.map((entry) => {
      const dot = el('button', 'progress-dot');
      dot.type = 'button';
      dot.title = entry.title;
      dot.setAttribute('aria-label', entry.title);
      dot.addEventListener('click', () => goTo(entry.node));
      container.append(entry.node);
      nav.append(dot);
      return { ...entry, dot, index: 0, active: false, timer: null };
    });
    status.hidden = true;

    let current = 0;
    states[0].dot.setAttribute('aria-current', 'true');

    function goTo(node) {
      node.scrollIntoView();
      node.focus({ preventScroll: true });
    }

    function setCurrent(i) {
      if (i === current) return;
      states[current].dot.removeAttribute('aria-current');
      current = i;
      states[i].dot.setAttribute('aria-current', 'true');
      header?.classList.toggle('hidden', i === 0);
      // keep the URL shareable without adding history entries
      try {
        history.replaceState(null, '', i === 0 ? location.pathname + location.search : `#${states[i].slug}`);
      } catch { /* not allowed in some embedding contexts; navigation still works */ }
    }

    // The section crossing the vertical middle of the viewport is the active one;
    // only it plays its video and cycles its demos.
    const byNode = new Map(states.map((state) => [state.node, state]));
    const viewObserver = new IntersectionObserver((records) => {
      records.forEach((record) => {
        const state = byNode.get(record.target);
        if (record.isIntersecting) {
          activate(state);
          setCurrent(states.indexOf(state));
        } else {
          deactivate(state);
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    states.forEach((state) => viewObserver.observe(state.node));

    // Index links navigate like the dots (replaceState, focus) instead of a plain anchor jump
    container.addEventListener('click', (event) => {
      const anchor = event.target.closest('a.index-link');
      if (!anchor) return;
      const state = states.find((item) => `#${item.slug}` === anchor.getAttribute('href'));
      if (!state) return;
      event.preventDefault();
      goTo(state.node);
    });

    // Deep links such as /#robop
    let hash = '';
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed escape in the URL: ignore it */ }
    const target = hash && states.find((state) => state.slug === hash);
    if (target) target.node.scrollIntoView({ behavior: 'instant' });

    // Keyboard navigation between sections
    const STEP = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ' ': 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 };
    document.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, video')) return; // let focused controls handle keys
      let next;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = states.length - 1;
      else if (event.key in STEP) next = current + (event.key === ' ' && event.shiftKey ? -1 : STEP[event.key]);
      else return;
      event.preventDefault();
      goTo(states[Math.min(Math.max(next, 0), states.length - 1)].node);
    });

    // On small screens the dot navigation only shows while scrolling (see style.css).
    let hideTimer;
    const revealNav = () => {
      nav.classList.add('visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => nav.classList.remove('visible'), NAV_HIDE_DELAY);
    };
    window.addEventListener('scroll', revealNav, { passive: true });
    document.addEventListener('touchstart', revealNav, { passive: true });
  }

  init().catch((error) => {
    // A bug while building the page must not leave the loading screen up forever.
    console.error(error);
    if (container.childElementCount) status.hidden = true; // whatever was built stays usable
    else status.textContent = 'Something went wrong while building the page.';
  });
})();
