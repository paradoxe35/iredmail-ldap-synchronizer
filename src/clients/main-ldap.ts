import { Client, Entry } from "ldapts";
import { EntriesStateDb } from "../datastore";
import { Buffer } from "buffer";
import { EMAIL_REGEX, lodash, wait } from "../utils";
import { CRUD_OPERATIONS, ModifiedEntry } from "../types";
import emitter, { KeyOfMessageEvents } from "../emitter";
import { ATTRIBUTES_OBSERVABLE } from "src/constants";
import { MissingEnvironmentVariableException } from "../exceptions";

const HOST = process.env.MAIN_LDAP_SERVER;
if (!HOST) {
  throw new MissingEnvironmentVariableException("MAIN_LDAP_SERVER");
}

const mainLDAPClient = new Client({
  url: `ldap://${HOST}`,
  timeout: 60 * 1000,
  connectTimeout: 0,
  strictDN: true,
});

/**
 * Ingore all entries from LDAP_IGNORE_USERS.
 * @param entries
 */
function ingore_users_entries(entries: Entry[]): Entry[] {
  const ignore_users = process.env.LDAP_IGNORE_USERS || "";
  const must_have_password = process.env.LDAP_MUST_HAVE_PASSWORD === "true";

  const users = ignore_users
    .split(",")
    .map((u) => u.trim())
    .filter((u) => EMAIL_REGEX.test(u));

  return entries.reduce((acc, entry) => {
    for (const user of users) {
      const st_entrt = JSON.stringify(entry);
      const has_password_attr = must_have_password
        ? st_entrt.includes("userPassword")
        : true;
      if (st_entrt.includes(user) && has_password_attr) {
        return acc;
      }
    }
    return [...acc, entry];
  }, <Entry[]>[]);
}

/**
 * Emit the crud event and wait for the response.
 */
function emit_event(event: KeyOfMessageEvents, ...args: any[]): Promise<any> {
  const eventId = `${Date.now()}-${Math.random()}`;
  // @ts-ignore
  emitter.emit(event, eventId, ...args);
  // @ts-ignore
  return new Promise((resolve) => emitter.once(eventId, resolve));
}

/**
 * A observer of entries on the main client ldap server.
 * this function should be called once.
 */
export default async function observe_main_client_entries() {
  const base_dn = process.env.MAIN_LDAP_BASE_DN || "";
  const bind_dn = process.env.MAIN_LDAP_BIND_DN || "";
  const bind_password = process.env.MAIN_LDAP_BIND_PASSWORD;

  if (!bind_dn || !bind_password || !base_dn) {
    throw new MissingEnvironmentVariableException(
      "MAIN_LDAP_BIND_PASSWORD, MAIN_LDAP_BIND_DN, MAIN_LDAP_BASE_DN"
    );
  }

  // Bind to the main client ldap server.
  await mainLDAPClient.bind(bind_dn, bind_password);

  // Process the observer loop.
  const process_loop = async () => {
    // Search for all entries.
    const result = await mainLDAPClient.search(base_dn, {
      filter: process.env.MAIN_LDAP_FILTER || "(objectClass=*)",
    });

    const entries = ingore_users_entries(result.searchEntries);

    const entries_hash = Buffer.from(JSON.stringify(entries)).toString(
      "base64"
    );

    // Compare the hash of the entries.
    const current_hash = await EntriesStateDb.get_hash();
    if (current_hash !== entries_hash) {
      // Update the hash.
      await EntriesStateDb.set_hash(entries_hash);

      const current_entries = <Entry[]>(
        JSON.parse(Buffer.from(current_hash, "base64").toString("ascii"))
      );

      const crud_operation = predict_crud_operation(entries, current_entries);

      const entries_verifier = new EntriesDiffVerifier(
        entries,
        current_entries
      );

      switch (crud_operation) {
        case "create":
          const c_entries = entries_verifier.verify_create_entries();
          await emit_event("create_entries", c_entries);
          break;
        case "delete":
          const d_entries = entries_verifier.verify_delete_entries();
          await emit_event("delete_entries", d_entries);
          break;
        case "update":
          const u_entries = entries_verifier.verify_update_entries();
          await emit_event("update_entries", u_entries);
          break;
        default:
          break;
      }
    }

    // Wait 5 seconds before next loop.
    await wait(5000);
    setImmediate(process_loop);
  };

  setImmediate(process_loop);
}

/**
 *
 * Get the crud operation (create | delete or update).
 *
 * @param lastest_entries
 * @param current_entries
 * @returns
 */
function predict_crud_operation(
  lastest_entries: Entry[],
  current_entries: Entry[]
): CRUD_OPERATIONS {
  // Create or Deletion verification.
  if (lastest_entries.length > current_entries.length) {
    return "create";
  } else if (lastest_entries.length < current_entries.length) {
    return "delete";
  }

  return "update";
}

/**
 *  EntriesDiffVerifier
 *
 *  Check entries differences
 */
class EntriesDiffVerifier {
  private lastest_entries: Entry[];
  private current_entries: Entry[];

  constructor(lastest_entries: Entry[], current_entries: Entry[]) {
    this.lastest_entries = lastest_entries;
    this.current_entries = current_entries;
  }

  public verify_create_entries(): Entry[] {
    return this.lastest_entries.filter(
      (entry) => !this.current_entries.map((e) => e.dn).includes(entry.dn)
    );
  }

  public verify_delete_entries(): Entry[] {
    return this.current_entries.filter(
      (entry) => !this.lastest_entries.map((e) => e.dn).includes(entry.dn)
    );
  }

  public verify_update_entries(): ModifiedEntry[] {
    const modified_entries: ModifiedEntry[] = [];

    for (const current_entry of this.current_entries) {
      const lastest_entry = this.lastest_entries.find(
        (e) => e.dn === current_entry.dn
      );
      if (!lastest_entry) {
        continue;
      }

      const diff_attrs = lodash.deepDiff(current_entry, lastest_entry);
      const modified_attributes: string[] = [];

      // verfiy the observable attributes are included in changed attributes. and they are not a object
      ATTRIBUTES_OBSERVABLE.forEach((att) => {
        if (diff_attrs[att] && typeof lastest_entry[att] !== "object") {
          modified_attributes.push(att);
        }
      });

      if (modified_attributes.length > 0) {
        modified_entries.push({
          entry: lastest_entry,
          modified_attributes: modified_attributes,
        });
      }
    }

    return modified_entries;
  }
}
