/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

// See: https://gjs.guide/extensions/topics/extension.html#extension
import Meta from "gi://Meta";
import Gio from "gi://Gio";

// See: https://gjs.guide/extensions/topics/extension.html#extension
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

export default class FullscreenToNewWorkspace extends Extension {

    enable() {
        this._mutterSettings = new Gio.Settings({ schema_id: 'org.gnome.mutter' });
        this.settings = this.getSettings();

        this._handles = [];
        // Trigger new window with maximize size and if the window is maximized
        this._handles.push(global.window_manager.connect('unminimize', (_, act) => {this.window_manager_unminimize(act);}));
        this._handles.push(global.window_manager.connect('size-changed', (_, act) => {this.window_manager_size_changed(act);}));
        this._handles.push(global.window_manager.connect('switch-workspace', (_) => {this.window_manager_switch_workspace();}));
        this._handles.push(global.window_manager.connect('minimize', (_, act) => {this.window_manager_minimize(act);}));
        this._handles.push(global.window_manager.connect('map', (_, act) => {this.window_manager_map(act);}));
        this._handles.push(global.window_manager.connect('destroy', (_, act) => {this.window_manager_destroy(act);}));
        this._handles.push(global.window_manager.connect('size-change', (_, act, change,rectold) => {this.window_manager_size_change(act,change,rectold);}));

        this._windowids_maximized = {};
        this._windowids_size_change = {};
    }

    disable() {
        this._mutterSettings = null;
        this.settings = null;

        // remove array and disconnect
        const handles_to_disconnect = this._handles.splice(0);
        handles_to_disconnect.forEach(h => global.window_manager.disconnect(h));

        this._windowids_maximized = {};
        this._windowids_size_change = {};
    }
    
    // First free workspace
    getFirstFreeWorkspace(manager) {
        const n = manager.get_n_workspaces();
        for (let i = 0; i < n; i++)
        {
            let win_count = manager.get_workspace_by_index(i).list_windows().filter(w => !w.is_always_on_all_workspaces()).length;
            if (win_count < 1)
                return i;
        }
        return -1;
    }
    placeOnWorkspace(win) {
        //global.log("achim","placeOnWorkspace:"+win.get_id());

        // Idea: don't move the coresponding window to an other workspace (it may be not fully active yet)
        // Reorder the workspaces and move all other window

        const wList = win.get_workspace().list_windows().filter(w => w!==win && !w.is_always_on_all_workspaces());
        if (wList.length >= 1) {
            const manager = win.get_display().get_workspace_manager();
            const current = manager.get_active_workspace_index();
            const firstfree = this.getFirstFreeWorkspace(manager);

            // No free workspace: do nothing
            if (firstfree === -1)
                return;

            // Reorder workspaces to place window on empty workspace
            manager.reorder_workspace(manager.get_workspace_by_index(firstfree), current);
            // Move other windows back to original workspace
            wList.forEach(w => {
                w.change_workspace_by_index(current, false);
            });

            // Remember reordered window
            this._windowids_maximized[win.get_id()] = "reorder";
        }
    }

    // back to workspace 0
    backto(win) {
        //global.log("achim","backto "+win.get_id());

        // Idea: don't move the coresponding window to an other workspace (it may be not fully active yet)
        // Reorder the workspaces and move all other window

        if (!(win.get_id() in this._windowids_maximized)) {
            // no new screen is used in the past: do nothing
            return;
        }

        // this is not longer maximized
        delete this._windowids_maximized[win.get_id()];

        const wList = win.get_workspace().list_windows().filter(w => w!==win && !w.is_always_on_all_workspaces());
        if (wList.length === 0) {
            const manager = win.get_display().get_workspace_manager();
            const current = manager.get_active_workspace_index();
            const nTarget = 0;  // Always move to workspace 0

            // Already on workspace 0: do nothing
            if (nTarget === current)
                return;

            const wListTarget = manager.get_workspace_by_index(nTarget).list_windows().filter(w => w!==win && !w.is_always_on_all_workspaces());

            // Move current workspace to workspace 0 position
            manager.reorder_workspace(manager.get_workspace_by_index(current), nTarget);
            // Move windows from workspace 0 back
            wListTarget.forEach(w => {
                w.change_workspace_by_index(nTarget, false);
            });
        }
    }
    
    window_manager_map(act)
    {
        const win = act.meta_window;
        if (this.shouldPlaceOnNewWorkspaceWin(win)) {
            this.placeOnWorkspace(win);
        } else if (this.isNormalWindow(win) && !win.is_maximized() && !win.fullscreen) {
            // Move non-maximized windows to workspace 0
            const manager = win.get_display().get_workspace_manager();
            const workspace0 = manager.get_workspace_by_index(0);
            if (win.get_workspace() !== workspace0) {
                win.change_workspace(workspace0);
            }
        }
    }
    
    window_manager_destroy(act)
    {
        const win = act.meta_window;
        if (!this.isNormalWindow(win)) {
            return;
        }
        this.backto(win);
    }

    window_manager_size_change(act,change,rectold) 
    {
        const win = act.meta_window;
        if (this.shouldPlaceOnNewWorkspaceChange(win, change)) {
            this.setToBePlaced(win);
        } else if (this.shouldPlaceBackToOldWorkspaceChange(win, change, rectold)) {
            this.setToBePlacedBack(win);
        }
    }

    window_manager_minimize(act)
    {
        const win = act.meta_window;
        if (!this.isNormalWindow(win)) {
            return;
        }
        this.backto(win);
    }

    window_manager_unminimize(act)
    {
        const win = act.meta_window;
        if (this.shouldPlaceOnNewWorkspaceWin(win)) {
            this.placeOnWorkspace(win);
        }
    }
    
    window_manager_size_changed(act)
    {
        const win = act.meta_window;
        //global.log("achim","window_manager_size_changed "+win.get_id());
        if (win.get_id() in this._windowids_size_change) {
            if (this.isToBePlaced(win)) {                
                this.placeOnWorkspace(win);
            } else if (this.isToBePlacedBack(win)) {                
                this.backto(win);
            }
            delete this._windowids_size_change[win.get_id()];
        }
    }

    window_manager_switch_workspace()
    {
        //global.log("achim","window_manager_switch_workspace");
    }

    isNormalWindow(win) {
        return (win.window_type === Meta.WindowType.NORMAL) && 
            !win.is_always_on_all_workspaces();
    }

    shouldPlaceOnNewWorkspaceWin(win) {
        return this.isNormalWindow(win) && (
            this.isMaximizeEnabled() ?
                // This is also true for fullscreen windows as well as maximized windows  
                win.is_maximized():
                win.fullscreen
        );
    }

    shouldPlaceOnNewWorkspaceChange(win, change) {
        return this.isNormalWindow(win) && (
            (this.isMaximizeEnabled() && 
                (change === Meta.SizeChange.MAXIMIZE) && 
                (win.is_maximized())) ||
            (change === Meta.SizeChange.FULLSCREEN)
        );
    }

    shouldPlaceBackToOldWorkspaceChange(win, change, rectold) {
        const rectmax=win.get_work_area_current_monitor();
        return this.isNormalWindow(win) && (
            (this.isMaximizeEnabled() && 
                (change === Meta.SizeChange.UNMAXIMIZE) &&
                    // do nothing if it was only partially maximized
                    rectmax.equal(rectold)) ||
            ((change === Meta.SizeChange.UNFULLSCREEN) && 
                (this.isMaximizeEnabled() ? 
                    (win.is_maximized()) :
                    true))
        );
    }

    isMaximizeEnabled() {
        return this.settings.get_boolean("move-window-when-maximized");
    }

    setToBePlaced(window) {
        this._windowids_size_change[window.get_id()]="place";
    }

    isToBePlaced(window) {
        return this._windowids_size_change[window.get_id()]=="place";
    }

    setToBePlacedBack(window) {
        this._windowids_size_change[window.get_id()]="back";
    }

    isToBePlacedBack(window) {
        return this._windowids_size_change[window.get_id()]=="back";
    }
}
