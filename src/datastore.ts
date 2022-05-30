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
  static async get_hash(): Promise<{ hash: string; _id: undefined }> {
    const hash = await entries_state_db.findOneAsync({});
    const str_hash = hash
      ? hash.hash
      : Buffer.from(JSON.stringify([])).toString("base64");
    // @ts-ignore
    return { hash: str_hash, _id: hash ? hash._id : undefined };
  }

  static async set_hash(hash: string, _id?: string): Promise<void> {
    await entries_state_db.updateAsync(
      _id ? { _id } : {},
      { $set: { hash } },
      { upsert: true }
    );
  }
}
