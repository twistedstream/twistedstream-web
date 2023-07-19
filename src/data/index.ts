import assert from "assert";
import { IDataProvider } from "../types/data";
import { dataProviderName } from "../utils/config";
import { logger } from "../utils/logger";
import { InMemoryDataProvider } from "../data/in-memory";

let provider: IDataProvider;

export function getProvider(): IDataProvider {
  if (!provider) {
    assert(dataProviderName, "Missing config: data provider name");
    switch (dataProviderName) {
      case "in-memory":
        provider = new InMemoryDataProvider([], []);
        break;
      // FUTURE: Google Sheets data provider
    }

    assert(provider, `Unsupported data provider name: ${dataProviderName}`);

    logger.info(`Data provider: ${dataProviderName}`);
  }

  return provider;
}
