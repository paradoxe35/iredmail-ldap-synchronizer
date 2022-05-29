import { Client, Entry } from "ldapts";
import { ModifiedEntry } from "src/types";

const iRedMailLDAPClient = new Client({
  url: "ldap://mail.icloudeng.com",
  timeout: 0,
  connectTimeout: 0,
  strictDN: true,
});

export function create_entries_handler(
  eventId: string,
  entries: Entry[]
): void {
  console.log(JSON.stringify(entries));
}

export function delete_entries_handler(
  eventId: string,
  entries: Entry[]
): void {
  console.log(JSON.stringify(entries));
}

export function update_entries_handler(
  eventId: string,
  entries: ModifiedEntry[]
): void {
  console.log(JSON.stringify(entries));
}
