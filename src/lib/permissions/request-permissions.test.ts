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

import { beforeEach, expect, mock, test } from "bun:test";

// 'harden' comes from 'lockdown()', which would freeze the intrinsics of the whole test process
(globalThis as unknown as { "harden": <T>(value: T) => T }).harden = <T>(value: T): T => value;

const storedPermissions: Record<string, Record<string, boolean>> = {};

mock.module("@/states/global.ts", () => ({
  "globalStates": { "extensions": { "permissions": storedPermissions } },
}));
mock.module("@/lib/permissions/handle-permission.ts", () => ({
  "handlePermission": (): string => "granted scope",
}));

const { grantStaticPermissions } = await import("@/lib/permissions/grant-static-permissions.ts");
const { __requestPermissions } = await import("@/lib/permissions/request-permissions.ts");

const pluginId: string = "plugin";
const permission = "time::performance";

// Answers every prompt with 'answer' and records which permissions were prompted
function prompter(answer: boolean): {
  "prompted": Array<string>;
  "request" : (permission?: string, extension?: string, resolve?: (state: boolean) => void) => void;
} {
  const prompted: Array<string> = [];

  return {
    prompted,
    "request": (permission, _extension, resolve): void => {
      if (permission && resolve) {
        prompted.push(permission);
        resolve(answer);
      }
    },
  };
}

beforeEach(() => {
  for (const key of Object.keys(storedPermissions)) {
    delete storedPermissions[key];
  }
});

test("a static grant is invisible to another artifact with the same ID", async () => {
  grantStaticPermissions({
    "id"            : pluginId,
    "artifactSha256": "artifact-x",
    "permissions"   : [permission],
  });

  const { prompted, request } = prompter(false);
  const granted = await __requestPermissions([permission], pluginId, "artifact-y", request);

  expect(prompted).toEqual([permission]);
  expect(granted).toEqual([false]);
});

test("a requested grant is invisible to another artifact with the same ID", async () => {
  const first = prompter(true);

  expect(await __requestPermissions([permission], pluginId, "artifact-x", first.request))
    .toEqual(["granted scope"]);

  const second = prompter(false);
  const granted = await __requestPermissions([permission], pluginId, "artifact-y", second.request);

  expect(second.prompted).toEqual([permission]);
  expect(granted).toEqual([false]);
});

test("a grant stays visible to the same artifact", async () => {
  grantStaticPermissions({
    "id"            : pluginId,
    "artifactSha256": "artifact-x",
    "permissions"   : [permission],
  });

  const { prompted, request } = prompter(false);
  const granted = await __requestPermissions([permission], pluginId, "artifact-x", request);

  expect(prompted).toEqual([]);
  expect(granted).toEqual(["granted scope"]);
});
