import { SinonStub } from "sinon";
import { RegisteredAuthenticator, User } from "./entity";

export type IntegrationTestState = {
  app: any;
  cookie?: any;
  users: User[];
  credentials: RegisteredAuthenticator[];

  verifyRegistrationResponseStub: SinonStub<any[], any>;
  verifyAuthenticationResponseStub: SinonStub<any[], any>;
};
