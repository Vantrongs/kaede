/*
 * Kaede, a Minecraft Launcher
 * Copyright (C) 2026  windstone <notwindstone@gmail.com> and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * Messages between the launcher and a sandboxed plugin worker.
 * Everything that comes from the worker is untrusted and validated by the host
 */

export type SandboxRequest = {
  "kind"      : "request";
  "id"        : number;
  "method"    : string;
  "parameters": unknown;
};
export type SandboxNotification = {
  "kind"      : "notify";
  "method"    : string;
  "parameters": unknown;
};
export type SandboxResponse = {
  "kind" : "response";
  "id"   : number;
  "ok"   : true;
  "value": unknown;
} | {
  "kind" : "response";
  "id"   : number;
  "ok"   : false;
  "error": string;
};
export type SandboxMessage = SandboxRequest | SandboxNotification | SandboxResponse;

// The first message posted to the worker, together with the 'MessagePort' it must use
export type SandboxBootMessage = {
  "source"     : string;
  // Granted static permissions that become 'scopedThis' keys
  "permissions": Array<string>;
};

export type SandboxLifecycleHook = "enable" | "disable" | "afterDisable";

export type SandboxLogLevel = "debug" | "info" | "warn" | "error";

export type SandboxFetchClient = "web" | "tauri";

// A fetch response reduced to data, rebuilt into 'RestrictedResponse' inside the worker
export type SandboxFetchResponse = {
  "status"     : number;
  "statusText" : string;
  "ok"         : boolean;
  "redirected" : boolean;
  "type"       : string;
  "url"        : string;
  "contentType": string;
  "body"       : ArrayBuffer;
};
