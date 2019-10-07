import { ILoadFileOptions, loadFile } from "@data-proxy/server";
import { IUser } from "omnipartners";

interface IVerifyUserFromOptions extends ILoadFileOptions {
  guidField?: string;
}

export const verifyUserFromFile = ({
  guidField = "guid",
  ...options
}: IVerifyUserFromOptions) => async (user: IUser) => {
  const entities = await loadFile(options);
  const guid = user.owner.guid;
  const entity = entities.find(e => e[guidField] === guid);
  return !!entity;
};
