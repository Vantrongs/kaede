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

import "ses";

import { getGrantKey } from "@/lib/permissions/get-grant-key.ts";
import { handlePermission } from "@/lib/permissions/handle-permission.ts";
import { globalStates } from "@/states/global.ts";
import type { PermissionType } from "@/types/extensions/permission.type.ts";

type PromptType = (
  permission?: PermissionType | string,
  extension?: string,
  resolve?: (state: boolean) => void
) => void;

// The prompt shows one permission at a time, so concurrent requests wait for their turn
let queue: Promise<unknown> = Promise.resolve();

export function __requestPermissions(
  permissions: Array<PermissionType | string> | unknown,
  extension: string,
  // Grants are stored per artifact, so a changed archive with the same ID does not inherit them
  artifactSha256: string,
  request: PromptType,
): Promise<Array<unknown>> {
  const current = queue.then(() => requestInTurn(permissions, extension, artifactSha256, request));

  // A failed request must not block the ones after it
  queue = current.catch(() => {});

  return current;
}

async function requestInTurn(
  permissions: Array<PermissionType | string> | unknown,
  extension: string,
  artifactSha256: string,
  request: PromptType,
): Promise<Array<unknown>> {
  if (!Array.isArray(permissions)) {
    throw new TypeError("Permissions must be an array");
  }

  const currentPermissions = globalStates.extensions.permissions;
  const key: string = getGrantKey(artifactSha256);
  const granted = [];

  try {
    for (const permission of permissions) {
      if (typeof permission !== "string") {
        throw new TypeError("A permission must be a string");
      }

      const hasPermission: boolean | undefined = currentPermissions?.[key]?.[permission];

      if (hasPermission !== undefined) {
        granted.push(hasPermission
          // 'handlePermission' validates the permission type, so we are safe to typecast
          ? handlePermission(permission as PermissionType, extension)
          : false);

        continue;
      }

      // This triggers a modal window with two buttons: 'allow' and 'disallow'
      const allowed = await new Promise((resolve: (state: boolean) => void) => {
        request(permission, extension, resolve);
      });

      granted.push(allowed
        // 'handlePermission' validates the permission type, so we are safe to typecast
        ? handlePermission(permission as PermissionType, extension)
        : false);

      if (currentPermissions[key] === undefined) {
        currentPermissions[key] = {};
      }

      currentPermissions[key][permission] = allowed;
    }
  } finally {
    // Clear the permissions request state by passing nothing, also when a grant failed
    request();
  }

  return harden(granted);
}
