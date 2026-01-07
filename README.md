# Project Showcase

A config-based project portfolio that loads projects from numbered directories.

## Structure

At the root of the `frontend` directory, create a `projects.json` file that defines the number of projects and their colors:

```json
{
  "num_projects": 10,
  "colors": [
    "#E5FFE5", 
    "#E5F3FF", 
    "#FFE5E5", 
    "#F5E5FF", 
    "#FFF5E5", 
    "#E5F3FF",
    "#E5FFFF",
    "#F0FFE5", 
    "#FFFFE5", 
    "#E5FFFF", 
    "#E5F3FF"
  ]
}
```

- `num_projects`: The highest project number (inclusive). For example, `10` means projects 0 through 10 will be loaded (11 projects total).
- `colors`: An array of background colors for each project. The array should have `num_projects + 1` colors (one for each project from 0 to num_projects).

Each project should be in its own directory following this pattern:

```
frontend/
  ├── projects.json
  ├── project_0/
  │   ├── config.json
  │   ├── demo_0.jpeg
  │   ├── demo_1.mp4
  │   └── ...
  ├── project_1/
  │   ├── config.json
  │   ├── demo_0.png
  │   └── ...
  └── project_2/
      ├── config.json
      └── ...
```

## Config.json Format

Each `config.json` file should contain:

```json
{
  "title": "Project Name",
  "firstCommit": "Jan 2023",
  "lastCommit": "Mar 2024",
  "abstract": "Project description...",
  "urls": {
    "github": "https://github.com/username/repo",
    "demo": "https://demo-url.com"
  },
  "demos": [
    {"type": "image", "file": "demo_0.png"},
    {"type": "video", "file": "demo_1.mp4"}
  ]
}
```

## Demo Files

- **Important**: Demo files must be explicitly listed in the `demos` array in `config.json`
- Each demo entry should specify:
  - `type`: Either `"image"` or `"video"`
  - `file`: The filename (e.g., `"demo_0.png"`, `"demo_1.mp4"`)
- Supported image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Supported video formats: `.mp4`, `.webm`, `.ogg`
- If multiple demos exist for a project, they will automatically cycle every 3 seconds
- Videos will autoplay (muted) when they become active
- **Performance**: Images and videos are lazy-loaded for faster initial page load

## Adding Projects

1. Create a new directory: `project_N` (where N is the next number)
2. Add a `config.json` file with your project information (including the `demos` array)
3. Add demo files as `demo_0.ext`, `demo_1.ext`, etc. in the project directory
4. List all demo files in the `demos` array of `config.json`
5. **Important**: Update `num_projects` in `frontend/projects.json` to `N` (if N is the highest project number)
6. **Important**: Add a color to the `colors` array in `frontend/projects.json` for the new project

## Features

- Config-based project and demo file listing
- Multiple demo support with automatic cycling
- Responsive design
- Keyboard navigation (Arrow keys)
- Progress bar navigation
- Smooth scrolling with snap points

