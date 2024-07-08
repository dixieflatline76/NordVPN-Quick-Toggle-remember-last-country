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
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import { QuickMenuToggle, SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { PopupSubMenuMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { spawnCommandLine } from 'resource:///org/gnome/shell/misc/util.js';

const connect = "nordvpn connect";
const disconnect = "nordvpn disconnect";
const iconName = "nordvpn-tray-white";

function getGioIcon(icon) {
  const ext = Extension.lookupByURL(import.meta.url)
  const file = ext.dir.resolve_relative_path(`icons/${icon}.svg`);
  return new Gio.FileIcon({ file });
}

function parseJsonFile(fileName, def = []) {
  const ext = Extension.lookupByURL(import.meta.url);
  const file = ext.dir.resolve_relative_path(fileName);
  let contents, success_;
  try {
    [success_, contents] = file.load_contents(null);
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(contents));
  } catch(e) {
    return def;
  }
}

const NordVPNMenuToggle = GObject.registerClass(
  class NordVPNMenuToggle extends QuickMenuToggle {
    constructor() {
      super({
        title: _('NordVPN'),
        iconName: iconName,
        toggleMode: true,
      });
      
      this.menu.setHeader(
        iconName,
        _('NordVPN Version 3.18.2')
      );

      const selectCountryMenuItem = new PopupSubMenuMenuItem(_('Select country'), true);
      selectCountryMenuItem.icon.set_gicon(getGioIcon("globe"));
      const countries = parseJsonFile("countries.json");
      countries.forEach((country) => {
        const gicon = getGioIcon(country);
        selectCountryMenuItem.menu.addAction(
          _(country.replaceAll("_", " ")),
          () => {
            spawnCommandLine(`${connect} ${country}`);
            this.gicon = gicon;
            this.checked = true;
          },
          gicon
        );
      });
      this.menu.addMenuItem(selectCountryMenuItem);

      this.connect('clicked', () => {
        if (this.checked) {
          spawnCommandLine(connect);
        } else {
          spawnCommandLine(disconnect);
        }
      });
    }
  });

const NordVPNIndicator = GObject.registerClass(
  class NordVPNIndicator extends SystemIndicator {
    constructor() {
      super();

      this._indicator = this._addIndicator();

      const toggle = new NordVPNMenuToggle();
      toggle.bind_property('checked',
        this._indicator, 'visible',
        GObject.BindingFlags.SYNC_CREATE);
      toggle.bind_property('gicon',
        this._indicator, 'gicon',
        GObject.BindingFlags.SYNC_CREATE);
      this.quickSettingsItems.push(toggle);
    }
  });

export default class QuickSettingsNordVPNExtension extends Extension {
  enable() {
    this._indicator = new NordVPNIndicator();
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator.quickSettingsItems.forEach(item => item.destroy());
    this._indicator.destroy();
  }
}
