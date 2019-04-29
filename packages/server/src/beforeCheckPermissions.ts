import Boom from "boom";
import micromatch from "micromatch";
import { IBeforeData } from "./types";

interface IBeforeCheckPermissionsOptions {
  projectId: string;
  allowedRefs?: string[];
  forbiddenRefs?: string[];
  pathMatch?: string;
}

export const beforeCheckPermissions = ({
  projectId: allowedProjectId,
  allowedRefs,
  forbiddenRefs,
  pathMatch,
}: IBeforeCheckPermissionsOptions) => async ({
  projectId,
  ref,
  path,
}: IBeforeData) => {
  if (allowedProjectId !== projectId) {
    throw Boom.notFound();
  }

  if (
    ref &&
    ((allowedRefs && allowedRefs.indexOf(ref) < 0) ||
      (forbiddenRefs && forbiddenRefs.indexOf(ref) >= 0))
  ) {
    throw Boom.unauthorized("This ref is not allowed.");
  }

  if (path && pathMatch && !micromatch.isMatch(path, pathMatch)) {
    throw Boom.unauthorized("This path is not allowed.");
  }
};
