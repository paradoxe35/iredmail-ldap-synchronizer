import { Client, Entry } from "ldapts";
import emitter from "src/emitter";
import { MissingEnvironmentVariableException } from "src/exceptions";
import { ModifiedEntry } from "src/types";

const HOST = process.env.IREDMAIL_LDAP_SERVER;
if (!HOST) {
  throw new MissingEnvironmentVariableException("IREDMAIL_LDAP_SERVER");
}

const iRedMailLDAPClient = new Client({
  url: `ldap://${HOST}`,
  timeout: 60 * 1000,
  connectTimeout: 0,
  strictDN: true,
});

export function create_entries_handler(
  eventId: string,
  entries: Entry[]
): void {
  console.log(JSON.stringify(entries));

  // @ts-ignore
  emitter.emit(eventId);
}

export function delete_entries_handler(
  eventId: string,
  entries: Entry[]
): void {
  console.log(JSON.stringify(entries));

  // @ts-ignore
  emitter.emit(eventId);
}

export function update_entries_handler(
  eventId: string,
  entries: ModifiedEntry[]
): void {
  console.log(JSON.stringify(entries));

  // @ts-ignore
  emitter.emit(eventId);
}
