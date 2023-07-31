import { SinonStub } from "sinon";
import { Invite, RegisteredAuthenticator, Share, User } from "./entity";

export type IntegrationTestState = {
  app: any;
  cookie?: any;
  users: User[];
  credentials: RegisteredAuthenticator[];

  verifyRegistrationResponseStub: SinonStub<any[], any>;
  verifyAuthenticationResponseStub: SinonStub<any[], any>;
};

export type InMemoryDataProviderOptions = {
  users: User[];
  credentials: RegisteredAuthenticator[];
  invites: Invite[];
  shares: Share[];
};
