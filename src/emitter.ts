import { EventEmitter } from "events";
import { Entry } from "ldapts";
import TypedEmitter from "typed-emitter";
import { ModifiedEntry } from "./types";

// Define your emitter's types like that:
// Key: Event name; Value: Listener function signature
export type MessageEvents = {
  error: (error: Error) => void;
  create_entries: (eventId: string, entries: Entry[]) => void;
  delete_entries: (eventId: string, entries: Entry[]) => void;
  update_entries: (eventId: string, entries: ModifiedEntry[]) => void;
};

// key of MessageEvents except error
export type KeyOfMessageEvents = Exclude<keyof MessageEvents, "error">;

const emitter = new EventEmitter() as TypedEmitter<MessageEvents>;

export default emitter;
