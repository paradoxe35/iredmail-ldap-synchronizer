import { Entry } from "ldapts";

export type CRUD_OPERATIONS = "create" | "read" | "update" | "delete";

export type ModifiedEntry = {
  modified_attributes: string[];
  entry: Entry;
};
