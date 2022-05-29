import Datastore from "@seald-io/nedb";

type EntriesStateDatastore = {
  hash: string;
};

export const entries_state_db = new Datastore<EntriesStateDatastore>({
  filename: "../entries-state.db",
  autoload: true,
});

// query functions
export class EntriesStateDb {
  static async get_hash(): Promise<string> {
    const hash = await entries_state_db.findOneAsync({});
    return hash ? hash.hash : "";
  }

  static async set_hash(hash: string): Promise<void> {
    await entries_state_db.updateAsync({}, { hash }, { upsert: true });
  }
}
