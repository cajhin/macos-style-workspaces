# macOS Style Workspaces
### GNOME Shell Extension
https://extensions.gnome.org/extension/(not registered yet)

Imitates how macOS deals with workspaces.  
Moves all normal windows to workspace 0 (the leftmost one).  
Moves all fullscreen and (optional) maximized windows to their own workspaces.  
A setting decides if maximized windows get their own space (default: true)  
Child dialogs of fullscreen apps like 'Open File dlg' (should) stay on the parent workspace.  

(Terminology) 'fullscreen' vs. 'maximized': a fullscreen window has no chrome (Title bar, borders) and covers the gnome bar, like F11 in FireFox.  

### Limitations
- Does not support multiple monitors (I prefer single large screens and cannot test it)
- Some special cases (like Firefox About window) are not recognized as child dialogs and move to workspace 0.

### Installation
1. clone repo
2. run in ./scripts: deploy.sh and reload.sh
3. sign out and back in (only needed on initial install, not for updates)

## Why?
I like the MacOS design better. In Gnome, i often lose/forget windows behind fullscreen apps.

## Credits
Loosely based on several forked, updated and abandoned projects building onto each other.
- The OG?: https://github.com/kaiseracm/gnome-shell-extension-maximize-to-empty-workspace
- https://github.com/onsah/fullscreen-to-new-workspace
- https://github.com/corgijan/fullscreen-to-new-workspace
- https://github.com/Picardas/fullscreen-to-workspace

...and claude for all the new stuff

