import Boom from "boom";
import micromatch from "micromatch";
import { IGetOptionsArg, IOptions, IOptionsGitlab } from ".";

interface IOptionsGetterArg {
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
    authCheck: async token => !!token,
    authLogin: async body => "foo",
    gitlab,
  };
};
