import "dotenv/config";
import emitter from "./emitter";
import {
  create_entries_handler,
  delete_entries_handler,
  update_entries_handler,
} from "./clients/iredmail-ldap";

import observe_main_client_entries from "./clients/main-ldap";

// Start observing the main client entries.
observe_main_client_entries();

/**
 * handle events from the main client ldap server.
 */

// Create entries handler.
emitter.on("create_entries", create_entries_handler);

// Delete entries handler.
emitter.on("delete_entries", delete_entries_handler);

// Update entries handler.
emitter.on("update_entries", update_entries_handler);
