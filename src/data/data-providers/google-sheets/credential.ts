import { DateTime } from "luxon";
import { Authenticator, RegisteredAuthenticator } from "../../../types/entity";
import { ColumnConstraints, RowData } from "../../../types/row";
import { rowToUser } from "./user";

export const CREDENTIAL_SHEET_NAME = "credentials";
export const CREDENTIAL_CONSTRAINTS: ColumnConstraints = { uniques: ["id"] };

export function rowToCredential(
  credentialRow: RowData,
  userRow: RowData
): RegisteredAuthenticator {
  return {
    credentialID: credentialRow.id,
    created: DateTime.fromISO(credentialRow.created),
    credentialPublicKey: credentialRow.public_key,
    counter: credentialRow.counter,
    aaguid: credentialRow.aaguid,
    credentialDeviceType: credentialRow.device_type,
    credentialBackedUp: credentialRow.is_backed_up,
    transports:
      credentialRow.transports &&
      credentialRow.transports.toString().split(","),
    user: rowToUser(userRow),
  };
}

export function credentialToRow(credential: Authenticator): RowData {
  return {
    id: credential.credentialID,
    created: credential.created.toISO(),
    public_key: credential.credentialPublicKey,
    counter: credential.counter,
    aaguid: credential.aaguid,
    device_type: credential.credentialDeviceType,
    is_backed_up: credential.credentialBackedUp,
    transports: credential.transports && credential.transports.join(","),
  };
}