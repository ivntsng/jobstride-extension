# JobStride Extension

A TypeScript-powered Chrome extension for tracking job applications across multiple job boards. Seamlessly integrates with the JobStride app to help you organize and manage your job search.

## Features

- **Multi-Platform Support**: Works on LinkedIn, Indeed, Greenhouse, Lever, Ashby, Rippling, and Workday (More to come)
- **Auto-Fill Job Details**: Automatically extracts company, position, location, salary, and job description
- **One-Click Save**: Save job postings with a single click

## Quick Start

### Prerequisites

- Google Chrome or Chromium-based browser

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ivntsng/jobstride-extension.git
   cd jobstride-extension
   ```

2. **Install bun** (if not already installed)

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Install dependencies**

   ```bash
   bun install
   ```

4. **Configure environment variables**

   Edit `env.ts` with your API configuration:

   ```env
   # API Configuration
   API_BASE_URL=http://localhost:8080
   WEB_APP_URL=http://localhost:5173
   ```

5. **Build the extension**

   ```bash
   bun run build
   ```

6. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top right corner)
   - Click **"Load unpacked"**
   - Select the `dist/` directory from this project

## Development

### Available Scripts

```bash
# Build extension for production
bun run build

# Type check without building
bun run type-check

# Watch mode for development (TypeScript compilation)
bun run dev

# Lint and check formatting
bun run lint

# Lint and auto-fix issues
bun run lint:fix

# Format code
bun run format

# Clean build artifacts
bun run clean
```

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `bun run build` to compile
3. Reload the extension in Chrome (click reload icon on `chrome://extensions/`)
4. Test your changes on supported job boards

## Supported Job Boards

| Platform   | Status | Features                    |
| ---------- | ------ | --------------------------- |
| LinkedIn   | ✅     | Full support with auto-fill |
| Indeed     | ✅     | Full support with auto-fill |
| Greenhouse | ✅     | Full support with auto-fill |
| Lever      | ✅     | Full support with auto-fill |
| Ashby      | ✅     | Full support with auto-fill |
| Workday    | ✅     | Full support with auto-fill |
| Rippling   | ✅     | Full support with auto-fill |

## Usage

1. Navigate to any supported job board (LinkedIn, Indeed, etc.)
2. Open a job posting
3. Click the **"Track This Job"** button that appears on the page
4. Review auto-filled details (company, position, location, etc.)
5. Select a dashboard
6. Click **"Save"** to add to your JobStride account

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run lint: `bun run lint`
5. Run type check: `bun run type-check`
6. Build: `bun run build`
7. Test the extension thoroughly
8. Commit: `git commit -am 'Add new feature'`
9. Push: `git push origin feature/my-feature`
10. Create a Pull Request
