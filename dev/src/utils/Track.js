/*
RegExr: Learn, Build, & Test RegEx
Copyright (C) 2017  gskinner.com, inc.
Modified for 규식이 (Gyusik) by sinsan-develop, 2026-10-11 (see NOTICE.md).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// 규식이 sends no analytics: these calls are kept as no-ops so existing callers still work.
let Track = {};
export default Track;

Track.page = function(path) {};

Track.event = function(name, category, label) {};


