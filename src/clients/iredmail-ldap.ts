import { Attribute, Change, Client, Entry } from "ldapts";
import { EMAIL_REGEX } from "../utils";
import { EMAIL_ATTTRIBUTES } from "../constants";
import emitter from "../emitter";
import { MissingEnvironmentVariableException } from "../exceptions";
import { ModifiedEntry } from "../types";
import { spawn } from "child_process";
import { writeFile } from "fs/promises";
import path from "path";

const HOST = process.env.IREDMAIL_LDAP_SERVER;
const BASE_DN = process.env.IREDMAIL_LDAP_BASE_DN || "";
const BIND_DN = process.env.IREDMAIL_LDAP_BIND_DN || "";
const BIND_PASSWORD = process.env.IREDMAIL_LDAP_BIND_PASSWORD;

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
  if (!BASE_DN || !BIND_PASSWORD || !BIND_DN) {
    throw new MissingEnvironmentVariableException(
      "IREDMAIL_LDAP_BASE_DN, IREDMAIL_LDAP_BIND_DN, IREDMAIL_LDAP_BIND_PASSWORD"
    );
  }

  await iRedMailLDAPClient.bind(BIND_DN, BIND_PASSWORD);

  process.on("SIGINT", iRedMailLDAPClient.unbind);
}

/**
 * Get email address from the entry.
 */
function get_email_from_entry(entry: Entry): string | null {
  for (const att of EMAIL_ATTTRIBUTES) {
    if (
      entry[att] &&
      typeof entry[att] === "string" &&
      EMAIL_REGEX.test(<string>entry[att])
    ) {
      return <string>entry[att];
    }
  }
  return null;
}

type UsersCreation = {
  domain: string;
  username: string;
  email: string;
  entry: Entry;
}[];

/**
 * Create user from py script spawn process.
 */
async function spawn_create_user_entry(users: UsersCreation) {
  const csv_content = users
    .map(({ domain, username }) => {
      const pwd = process.env.LDAP_DEFAULT_PASSWORD || "0000";
      return `${domain}, ${username}, ${pwd}`;
    })
    .join("\n");

  const users_csv_file = path.resolve(process.cwd(), "tools/users.csv");
  // write user content csv file
  await writeFile(users_csv_file, csv_content);

  // python script path
  const python_script = "create_mail_user_OpenLDAP.py";

  const ls = spawn("python3", [python_script, "users.csv"], {
    cwd: path.resolve(process.cwd(), "tools"),
  });

  return new Promise((resolve, reject) => {
    ls.on("error", reject);
    ls.on("close", resolve);
  });
}

/**
 * Get email by mail attribute.
 * @returns
 */
async function get_one_entry(filter: string): Promise<Entry | undefined> {
  const result = await iRedMailLDAPClient.search(BASE_DN, {
    filter,
  });

  return result.searchEntries[0];
}

/**
 * Create entries handler.
 */
export async function create_entries_handler(
  eventId: string,
  entries: Entry[]
): Promise<void> {
  const users = entries
    .map((entry) => {
      const email = get_email_from_entry(entry);
      if (!email) return null;
      const username = email.slice(0, email.indexOf("@"));
      const domain = email.slice(email.indexOf("@") + 1);
      return { domain, username, entry, email };
    })
    .filter(Boolean) as UsersCreation;

  // verify if domain exists
  const checked_domains: string[] = [];
  let new_users: UsersCreation = users;
  for (const { domain } of users) {
    if (checked_domains.includes(domain)) continue;
    const exist = await get_one_entry(`(&(domainName=${domain}))`);
    if (!exist) {
      new_users = users.filter((u) => u.domain !== domain);
    }
    checked_domains.push(domain);
  }

  await spawn_create_user_entry(new_users);

  // update entries userPassword
  for (const { entry } of new_users) {
    const change = new Change({
      operation: "replace",
      modification: new Attribute({
        type: "userPassword",
        values: [<string>entry["userPassword"]],
      }),
    });

    await iRedMailLDAPClient.modify("cn=foo, o=example", change);
  }

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
