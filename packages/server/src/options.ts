import Boom from "boom";
import micromatch from "micromatch";
import { IGetOptionsArg, IOptions, IOptionsAuth, IOptionsGitlab } from "./server";

interface IOptionsGetterArg extends IOptionsAuth {
  gitlab: IOptionsGitlab;
  projectId: string;
  allowedRefs?: string[];
  forbiddenRefs?: string[];
  pathMatch?: string;
}

export const optionsGetter = ({
  gitlab,
  projectId: allowedProjectId,
  allowedRefs,
  forbiddenRefs,
  pathMatch,
  authCheck,
  authLogin,
}: IOptionsGetterArg) => async ({
  projectId,
  ref,
  path,
}: IGetOptionsArg): Promise<IOptions | undefined> => {
  if (allowedProjectId !== projectId) {
    return;
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

  return {
    authCheck,
    authLogin,
    gitlab,
  };
};
