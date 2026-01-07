# Project Showcase

A config-based project portfolio that automatically loads projects from numbered directories.

## Structure

Each project should be in its own directory following this pattern:

```
project_0/
  ├── config.json
  ├── demo_0.jpeg
  ├── demo_1.mp4
  └── ...

project_1/
  ├── config.json
  ├── demo_0.png
  └── ...

project_2/
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
  }
}
```

## Demo Files

- Number your demo files starting from 0: `demo_0`, `demo_1`, `demo_2`, etc.
- Supported image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Supported video formats: `.mp4`, `.webm`, `.ogg`
- If multiple demos exist for a project, they will automatically cycle every 3 seconds
- Videos will autoplay (muted) when they become active

## Adding Projects

1. Create a new directory: `project_N` (where N is the next number)
2. Add a `config.json` file with your project information
3. Add demo files as `demo_0.ext`, `demo_1.ext`, etc.
4. The page will automatically discover and load your project!

## Features

- Automatic project discovery
- Multiple demo support with automatic cycling
- Responsive design
- Keyboard navigation (Arrow keys)
- Progress bar navigation
- Smooth scrolling with snap points

