import { ILoadFileListOptions, loadFileList } from "@data-proxy/server";
import { IUser } from "omnipartners";

interface IVerifyUserFromListOptions extends ILoadFileListOptions {
  guidField?: string;
}

export const verifyUserFromFileList = ({
  guidField = "guid",
  ...options
}: IVerifyUserFromListOptions) => async (user: IUser) => {
  const entities = await loadFileList(options);
  const guid = user.owner.guid;
  const entity = entities.find(e => e[guidField] === guid);
  return !!entity;
};
