import micromatch from "micromatch";
import { IBeforeData } from "./types";
import { unauthorized } from "@hapi/boom";

interface IBeforeCheckPermissionsOptions {
  allowedRefs?: string[];
  forbiddenRefs?: string[];
  pathMatch?: string;
}

export const beforeCheckPermissions = ({
  allowedRefs,
  forbiddenRefs,
  pathMatch,
}: IBeforeCheckPermissionsOptions) => async ({
  ref,
  path,
}: IBeforeData) => {
  if (
    ref &&
    ((allowedRefs && allowedRefs.indexOf(ref) < 0) ||
      (forbiddenRefs && forbiddenRefs.indexOf(ref) >= 0))
  ) {
    throw unauthorized("This ref is not allowed.");
  }

  if (path && pathMatch && !micromatch.isMatch(path, pathMatch)) {
    throw unauthorized("This path is not allowed.");
  }
};
