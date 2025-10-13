# NextStep Extension

A TypeScript-powered Chrome extension for tracking job applications across multiple job boards. Seamlessly integrates with the NextStep app to help you organize and manage your job search.

## Features

- **Multi-Platform Support**: Works on LinkedIn, Indeed, Greenhouse, Lever, Ashby, and Workday (More to come)
- **Auto-Fill Job Details**: Automatically extracts company, position, location, salary, and job description
- **One-Click Save**: Save job postings with a single click

## Quick Start

### Prerequisites

- Google Chrome or Chromium-based browser

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd nextstep-extension
   ```

2. **Install pnpm** (if not already installed)

   ```bash
   npm install -g pnpm
   ```

3. **Install dependencies**

   ```bash
   pnpm install
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
   pnpm run build
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
pnpm run build

# Type check without building
pnpm run type-check

# Watch mode for development (TypeScript compilation)
pnpm run dev

# Clean build artifacts
pnpm run clean
```

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `pnpm run build` to compile
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

## Usage

1. Navigate to any supported job board (LinkedIn, Indeed, etc.)
2. Open a job posting
3. Click the **"Track This Job"** button that appears on the page
4. Review auto-filled details (company, position, location, etc.)
5. Select a dashboard
6. Click **"Save"** to add to your NextStep account

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run type check: `pnpm run type-check`
5. Build: `pnpm run build`
6. Test the extension thoroughly
7. Commit: `git commit -am 'Add new feature'`
8. Push: `git push origin feature/my-feature`
9. Create a Pull Request
