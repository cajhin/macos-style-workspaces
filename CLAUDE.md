# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GNOME Shell extension that replicates macOS workspace behavior. It automatically moves:
- All windowed (non-maximized) apps to workspace 0
- All fullscreen apps to their own dedicated workspaces
- Optionally, maximized windows to their own workspaces (configurable via settings)

The extension does not support multiple monitors.

## Development Commands

### Deploy Extension
```bash
cd scripts
./deploy.sh
```
This copies the `src/` directory to `~/.local/share/gnome-shell/extensions/macos-style-workspaces@cajhin` and compiles GSettings schemas.

### Reload Extension During Development
```bash
cd scripts
./reload.sh
```
This disables and re-enables the extension, then checks journalctl for errors from the last 5 seconds.

### Build Distribution Package
```bash
cd scripts
./makezip.sh
```
Creates `build/macos-style-workspaces@cajhin.zip` for distribution.

### Initial Installation
After first deployment, sign out and back in to activate the extension. For subsequent updates, use `reload.sh`.

## Architecture

### Core Files

**src/extension.js** - Main extension logic
- `MacOSStyleWorkspaces` class extends GNOME's Extension class
- Event handlers for window manager signals: `map`, `destroy`, `size-change`, `size-changed`, `minimize`, `unminimize`, `switch-workspace`
- Two tracking dictionaries:
  - `_windowids_maximized` - tracks windows that have been moved to dedicated workspaces
  - `_windowids_size_change` - tracks windows pending placement changes (values: "place" or "back")

**src/prefs.js** - Preferences UI
- `Preferences` class extends ExtensionPreferences
- Creates GTK4/Adwaita preferences window with single toggle: "Move window when maximized"

**src/metadata.json** - Extension metadata
- UUID: `macos-style-workspaces@cajhin`
- Target shell versions: 49, 50
- Settings schema: `org.gnome.shell.extensions.macos-style-workspaces`

**src/schemas/org.gnome.shell.extensions.macos-style-workspaces.gschema.xml** - GSettings schema
- Single boolean key: `move-window-when-maximized` (default: true)

### Key Architecture Patterns

**Workspace Reordering Strategy**
The extension uses a clever workspace reordering approach rather than moving windows directly:
- `placeOnWorkspace()` finds the first empty workspace and reorders it to the current position, then moves other windows back
- `backto()` reorders workspaces to move unmaximized windows back to workspace 0
- This prevents issues with windows not being fully activated yet

**Window Classification**
- `isNormalWindow()` - filters for Meta.WindowType.NORMAL windows that aren't on all workspaces
- `hasTransientParent()` - detects child windows (dialogs, utility windows) that should stay with their parent
- Dialog windows and windows with transient parents are kept on the same workspace as their parent

**Event Flow**
1. `size-change` event → sets placement flags in `_windowids_size_change`
2. `size-changed` event → reads flags and executes placement or backto
3. `map` event → handles new windows, including child window placement
4. `destroy`/`minimize` events → triggers `backto()` for cleanup

### Important Implementation Details

- Child windows (dialogs, modal dialogs, any window with a transient parent) are always placed on the same workspace as their parent window
- The extension only affects normal windows (Meta.WindowType.NORMAL) that aren't set to appear on all workspaces
- Fullscreen windows always get their own workspace regardless of settings
- Maximized windows only get their own workspace if `move-window-when-maximized` is true
- When un-maximizing, the extension checks if the window was truly fully maximized (not partially) before moving it back by comparing `rectold` with the work area

## Debugging

View extension logs:
```bash
journalctl -b --since "5 seconds ago" | grep -i "cajhin\|macos-style-workspaces"
```

The extension uses commented-out `global.log("achim", ...)` calls throughout the code for debugging. Uncomment these to trace execution flow.
