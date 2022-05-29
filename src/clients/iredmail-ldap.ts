import { Client, Entry } from "ldapts";
import emitter from "../emitter";
import { MissingEnvironmentVariableException } from "../exceptions";
import { ModifiedEntry } from "../types";

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

/**
 * Bind dn to the ldap server.
 */
export async function iredmail_server_bind_dn() {
  const base_dn = process.env.IREDMAIL_LDAP_BASE_DN || "";
  const bind_dn = process.env.IREDMAIL_LDAP_BIND_DN || "";
  const bind_password = process.env.IREDMAIL_LDAP_BIND_PASSWORD;

  if (!bind_dn || !bind_password || !base_dn) {
    throw new MissingEnvironmentVariableException(
      "IREDMAIL_LDAP_BASE_DN, IREDMAIL_LDAP_BIND_DN, IREDMAIL_LDAP_BIND_PASSWORD"
    );
  }

  await iRedMailLDAPClient.bind(bind_dn, bind_password);

  process.on("SIGINT", iRedMailLDAPClient.unbind);
}

/**
 * Create entries handler.
 */
export function create_entries_handler(
  eventId: string,
  entries: Entry[]
): void {
  console.log(JSON.stringify(entries));

  // @ts-ignore
  emitter.emit(eventId);
}

/**
 * Delete entries handler.
 */
export function delete_entries_handler(
  eventId: string,
  entries: Entry[]
): void {
  console.log(JSON.stringify(entries));

  // @ts-ignore
  emitter.emit(eventId);
}

/**
 * Update entries handler.
 */
export function update_entries_handler(
  eventId: string,
  entries: ModifiedEntry[]
): void {
  console.log(JSON.stringify(entries));

  // @ts-ignore
  emitter.emit(eventId);
}
