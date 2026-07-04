# ArchHotel 3D Tycoon — Windows Edition

A hotel design and management simulator. Build floor plans in 2D, explore in 3D, hire staff, serve guests, and grow your hotel chain.

**This is the Windows-optimized edition** in its own folder, separate from the original project.

## Quick Start (Easiest)

1. Install [Node.js 18+](https://nodejs.org/) (LTS recommended)
2. Double-click **`START.bat`**
3. Your browser opens at **http://localhost:3000**

That's it. No API key required for gameplay — presets, design, management, and local saves all work offline.

## What You Can Do

| Mode | Description |
|------|-------------|
| **Design** | Paint floors, walls, beds, elevators in 2D; view in 3D or Walk mode |
| **Management** | Hire staff, manage guests, set room rates, run your hotel chain |
| **Analytics** | Track revenue, occupancy, and performance charts |

## Saving Your Progress

- **Without signing in:** Progress auto-saves to your browser every 30 seconds. Click **Save** in the top bar for an immediate save.
- **With Google Sign-In:** Optional cloud sync via Firebase (same as the original app).

## AI Hotel Generation (Optional)

To use **Draft Hotel with AI** in Management → AI & Presets:

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Copy `.env.example` to `.env.local` (START.bat does this automatically)
3. Edit `.env.local` and replace `MY_GEMINI_API_KEY` with your key
4. Restart the app

## Manual Start (Command Line)

```powershell
cd "C:\Users\User-2\Downloads\Hotel-managment-Simulator-Windows"
npm install
npm run dev
```

Or use PowerShell: `.\START.ps1`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Node.js is not installed" | Install from https://nodejs.org/ and restart |
| Port 3000 in use | Set `PORT=3001` in `.env.local` |
| AI generation fails | Add a valid `GEMINI_API_KEY` to `.env.local` |
| Blank page | Wait a few seconds on first run; Vite compiles on startup |
| PowerShell script blocked | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once |

## Windows Improvements Over Original

- **START.bat** — one-click launcher with dependency checks
- **Local auto-save** — no account needed to keep progress
- **Auto-opens browser** on start
- **Cross-platform clean script** (`rimraf` instead of Unix `rm`)
- **Clearer API key setup** and error messages
- **Health endpoint** at `/api/health`

## Build for Production

```powershell
npm run build
npm start
```

## Requirements

- Windows 10/11
- Node.js 18 or newer
- Modern browser (Chrome, Edge, Firefox)
