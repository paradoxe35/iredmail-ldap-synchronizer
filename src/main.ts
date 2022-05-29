import "dotenv/config";
import emitter from "./emitter";
import {
  create_entries_handler,
  delete_entries_handler,
  iredmail_server_bind_dn,
  update_entries_handler,
} from "./clients/iredmail-ldap";
import observe_main_client_entries from "./clients/main-ldap";

// Start observing the main client entries.
observe_main_client_entries();

// Bing IredMail LDAP server.
iredmail_server_bind_dn();

/** Handle events from the main client ldap server. */
// Create entries event.
emitter.on("create_entries", create_entries_handler);

// Delete entries event.
emitter.on("delete_entries", delete_entries_handler);

// Update entries event.
emitter.on("update_entries", update_entries_handler);
