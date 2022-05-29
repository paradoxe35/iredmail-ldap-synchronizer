import Datastore from "@seald-io/nedb";
import { Buffer } from "buffer";
import path from "path";

type EntriesStateDatastore = {
  hash: string;
};

export const entries_state_db = new Datastore<EntriesStateDatastore>({
  filename: path.relative(process.cwd(), "entries_state.db"),
  autoload: true,
});


// query functions
export class EntriesStateDb {
  static async get_hash(): Promise<string> {
    const hash = await entries_state_db.findOneAsync({});
    return hash
      ? hash.hash
      : Buffer.from(JSON.stringify([])).toString("base64");
  }

  static async set_hash(hash: string): Promise<void> {
    await entries_state_db.updateAsync({}, { hash }, { upsert: true });
  }
}
