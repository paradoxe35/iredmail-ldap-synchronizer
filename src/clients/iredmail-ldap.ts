import { Attribute, Change, Client, Entry } from "ldapts";
import { EMAIL_REGEX } from "../utils";
import { EMAIL_ATTTRIBUTES } from "../constants";
import emitter from "../emitter";
import { MissingEnvironmentVariableException } from "../exceptions";
import { ModifiedEntry } from "../types";
import { spawn } from "child_process";
import { writeFile } from "fs/promises";
import path from "path";
import { ssha_pass_async } from "../ssha";

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
function get_email_from_entry(
  entry: Entry
): { domain: string; username: string; email: string } | null {
  for (const att of EMAIL_ATTTRIBUTES) {
    if (
      entry[att] &&
      typeof entry[att] === "string" &&
      EMAIL_REGEX.test(<string>entry[att])
    ) {
      const email = <string>entry[att];
      const username = email.slice(0, email.indexOf("@"));
      const domain = email.slice(email.indexOf("@") + 1);
      return { domain, username, email };
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
    env: process.env,
  });

  return new Promise((resolve, reject) => {
    ls.stdout.on("error", reject);
    ls.stdout.on("end", resolve);
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
 * Change user password entry
 */
async function change_user_password(dn: string, password: string) {
  const change = new Change({
    operation: "replace",
    modification: new Attribute({
      type: "userPassword",
      values: [password],
    }),
  });

  return await iRedMailLDAPClient.modify(dn, change);
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
      const email_data = get_email_from_entry(entry);
      if (!email_data) return null;
      return { entry, ...email_data };
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

  const update_password = async () => {
    for (const { email, entry } of new_users) {
      const user = await get_one_entry(`(&(mail=${email}))`);
      if (user) {
        await change_user_password(user.dn, <string>entry.userPassword);
        new_users = new_users.filter((u) => u.email !== email);
      }
    }
    return new_users;
  };

  // Change user password if exists
  new_users = await update_password();

  // Create use entries
  await spawn_create_user_entry(new_users);

  // update created entries userPassword
  await update_password();

  // @ts-ignore
  emitter.emit(eventId);
}

/**
 * Delete entries handler.
 */
export async function delete_entries_handler(
  eventId: string,
  entries: Entry[]
): Promise<void> {
  for (const entry of entries) {
    const email_data = get_email_from_entry(entry);
    if (!email_data) continue;

    const { email } = email_data;
    // get user entry from ldap
    const user = await get_one_entry(`(&(mail=${email}))`);
    if (!user) continue;
    // Update password with random password
    const random_password = await ssha_pass_async(
      Math.random().toString(36).slice(-8)
    );
    await change_user_password(user.dn, random_password);
  }

  // @ts-ignore
  emitter.emit(eventId);
}

/**
 * Update entries handler.
 */
export async function update_entries_handler(
  eventId: string,
  entries: ModifiedEntry[]
): Promise<void> {
  for (const { entry, modified_attributes } of entries) {
    const email_data = get_email_from_entry(entry);
    if (!email_data) continue;

    const { email } = email_data;
    // get user entry from ldap
    const user = await get_one_entry(`(&(mail=${email}))`);
    if (!user) continue;

    for (const attr of modified_attributes) {
      const change = new Change({
        operation: "replace",
        modification: new Attribute({
          type: attr,
          values: [<any>entry[attr]],
        }),
      });
      await iRedMailLDAPClient.modify(user.dn, change);
    }
  }
  // @ts-ignore
  emitter.emit(eventId);
}
