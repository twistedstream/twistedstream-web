import assert from "assert";

import { InMemoryDataProvider } from "../data/in-memory";
import { IDataProvider } from "../types/data";
import { dataProviderName } from "../utils/config";
import { logger } from "../utils/logger";

let provider: IDataProvider;

export function getProvider(): IDataProvider {
  if (!provider) {
    assert(dataProviderName, "Missing config: data provider name");
    switch (dataProviderName) {
      case "in-memory":
        provider = new InMemoryDataProvider({
          users: [],
          credentials: [],
          invites: [],
          shares: [],
        });
        break;
      // FUTURE: Google Sheets data provider
    }

    assert(provider, `Unsupported data provider name: ${dataProviderName}`);

    logger.info(`Data provider: ${dataProviderName}`);
  }

  return provider;
}
