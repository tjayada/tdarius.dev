# tdarius.dev

My project portfolio: a static site that reads a list of projects from
`frontend/projects.json` and renders one full-screen section per project. There is
no build step, no framework and no backend. The `frontend` directory is deployed
as-is.

## Structure

```
frontend/
├── index.html          page skeleton (header, section container, dot navigation)
├── app.js              loads profile.json, projects.json and the config.json files
├── theme.js            colour theme toggle, shared by index.html and 404.html (not deferred, so a stored choice applies before the first paint)
├── style.css           styles for index.html and 404.html (light + dark mode)
├── 404.html            not-found page
├── profile.json        intro and contact sections: bio, links, publications, awards
├── projects.json       ordered list of project folders + colour palette
├── assets/             favicons and the 404 image
└── projects/
    ├── robop/
    │   └── config.json
    ├── robot-renderer/
    │   ├── config.json
    │   └── demo_0.webp
    └── ...
```

The page is: intro section, one section per project, contact section.

`projects.json` decides which projects are shown and in which order:

```json
{
  "projects": ["robop", "robot-detector", "dino-wm-tokens", "straya-mapp"],
  "palette": ["#E5F3FF", "#FFE5E5", "#E5FFE5", "#F5E5FF"]
}
```

- `projects`: folder names under `frontend/projects/`, top to bottom. Reordering or
  removing a project only means editing this list.
- `palette`: background colours, cycled through in order (the intro takes the first
  one). A project can override its colour with a `"color"` field in its `config.json`.
  In dark mode the colour is used as a tint on a dark background.

## profile.json

Everything on the intro and contact sections. Empty strings and entries without a
`url` are simply not shown, so unused fields can stay in the file.

```json
{
  "name": "Tjark Darius",
  "tagline": "One line on what you do.",
  "bio": "Two or three sentences.",
  "status": "What you are looking for, and from when.",
  "location": "City, Country",
  "contactText": "Short text for the contact section.",
  "links": [
    {"label": "Email", "url": "mailto:you@example.com"},
    {"label": "CV", "url": "/assets/cv.pdf"},
    {"label": "GitHub", "url": "https://github.com/username"}
  ],
  "publications": [
    {
      "title": "Paper title",
      "authors": "A. Author, B. Author",
      "venue": "Workshop or conference, year",
      "links": [{"label": "PDF", "url": "https://…"}]
    }
  ],
  "publicationsNote": "Optional line below the list, e.g. a paper under review.",
  "awards": [
    {"title": "Scholarship or prize", "note": "2023"}
  ]
}
```

The header (name, LinkedIn link, theme toggle) is static HTML in `index.html` and
`404.html`, so it shows before any JSON has loaded. Change the LinkedIn URL there as well.

## config.json

```json
{
  "title": "Project Name",
  "context": "Master's thesis",
  "period": "Apr – Sep 2026",
  "abstract": "One plain-language sentence first, then the technical detail.",
  "highlight": "One line with the main result or outcome.",
  "tags": ["Python", "PyTorch3D"],
  "color": "#E5F3FF",
  "urls": {
    "github": "https://github.com/username/repo",
    "demo": "https://demo-url.com",
    "paper": "https://…/paper.pdf"
  },
  "demos": [
    {"type": "image", "file": "demo_0.webp"},
    {"type": "video", "file": "demo_1.mp4", "poster": "poster.webp"},
    {"type": "image", "url": "https://raw.githubusercontent.com/user/repo/main/figure.png", "fit": "contain", "background": "#ffffff", "alt": "What the figure shows"}
  ]
}
```

- `context` and `period` form the line under the title ("Master's thesis · Apr – Sep
  2026"). The intro's project index shows the context and the year(s) only.
- `abstract`: the first sentence has to stand on its own. Phones show only that
  sentence, with a "More" button for the rest, so a slide fits on one screen. The split
  is the first `.`, `?` or `!` followed by a capital letter.
- `highlight` is shown as an emphasised line under the abstract. Leave it empty if
  there is no result worth stating.
- `tags` become small chips. Keep them to the technologies a reader would search for.
- `urls.github`, `urls.demo` and `urls.paper` are shown as buttons. Clicking the demo
  media opens the live demo if there is one, otherwise the repository.
- `color` (optional) overrides the palette colour.

### Demos

Each entry in `demos` needs a `type` (`image` or `video`) and either `file` (a file in
the project folder) or `url` (a hosted file, for example a raw GitHub URL, which keeps
the repo small and saves hosting bandwidth). Hosted files must use `https://`; the
page's content security policy (in `index.html`) blocks anything else.

Optional fields:

- `fit`: `cover` (default, fills the 16:9 frame and crops) or `contain` (shows the
  whole image with bars, good for figures and diagrams).
- `background`: colour behind a `contain` image, usually the figure's own background.
  Without it, a blurred copy of the image fills the frame behind it.
- `alt`: alt text for screen readers. Defaults to "`<title>` demo".
- `poster` / `posterUrl` (videos): a still shown while the video loads, and instead of
  it where autoplay is refused (for example iOS Low Power Mode). Worth adding for
  every video.

If a project has several demos they cross-fade every 3.5 seconds while the project is
in view. Videos are muted, loop, and only start loading when their project scrolls
into view.

Images: `.webp`, `.png`, `.jpg`, `.gif`. Videos: `.mp4`, `.webm`. Keep local files
small, for example `magick in.png -resize 1600x -quality 82 out.webp`.

## Adding a project

1. Create `frontend/projects/<slug>/` with a `config.json` (and local demo files if any).
   The slug is the folder name, the section id and the URL hash, so use letters, digits
   and hyphens only; `intro` and `contact` are taken by the fixed sections.
2. Add `<slug>` to the `projects` list in `frontend/projects.json` where it should appear.

Each section can be linked directly as `https://www.tdarius.dev/#<slug>`.

## Running locally

Any static file server works, for example:

```bash
cd frontend && python3 -m http.server 8000
```

## Features

- Profile, projects and demos defined in JSON, no code changes needed to add one
- Full-screen sections with scroll snapping, dot navigation and keyboard navigation
  (arrow keys, Page Up/Down, Home/End, Space)
- Dark mode follows the OS and can be toggled in the header (the choice is remembered in the browser), reduced-motion support, lazy-loaded media
- Works on phones: slides snap one per screen, abstracts collapse to their first sentence, the intro splits into three screens (text, publications and awards, project index), and the dot navigation hides itself while not scrolling
- Adapts to the window: the intro is a 2x2 grid on one screen where that fits (from 1200px wide and 760px tall), and the same three stacked screens as on phones everywhere else
