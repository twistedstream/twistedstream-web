import { CookieMap } from "set-cookie-parser";
import { SinonStub } from "sinon";

import {
  FileInfo,
  Invite,
  RegisteredAuthenticator,
  Share,
  User,
} from "./entity";

export type IntegrationTestState = {
  app: any;
  cookies: CookieMap;
  csrfToken: string;
  redirectUrl: string;
  users: User[];
  credentials: RegisteredAuthenticator[];
  invites: Invite[];
  shares: Share[];

  createRootUserAndInvite: () => Promise<Invite | undefined>;

  verifyRegistrationResponseStub: SinonStub<any[], any>;
  verifyAuthenticationResponseStub: SinonStub<any[], any>;
};

export type InMemoryDataProviderOptions = {
  users?: User[];
  credentials?: RegisteredAuthenticator[];
  invites?: Invite[];
  shares?: Share[];
  files?: FileInfo[];
};
