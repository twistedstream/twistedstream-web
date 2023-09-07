import { SinonStub } from "sinon";
import {
  DocumentInfo,
  Invite,
  RegisteredAuthenticator,
  Share,
  User,
} from "./entity";

export type IntegrationTestState = {
  app: any;
  cookie?: any;
  users: User[];
  createRootUserAndInvite: () => Promise<Invite | undefined>;
  credentials: RegisteredAuthenticator[];

  verifyRegistrationResponseStub: SinonStub<any[], any>;
  verifyAuthenticationResponseStub: SinonStub<any[], any>;
};

export type InMemoryDataProviderOptions = {
  users?: User[];
  credentials?: RegisteredAuthenticator[];
  invites?: Invite[];
  shares?: Share[];
  files?: DocumentInfo[];
};
