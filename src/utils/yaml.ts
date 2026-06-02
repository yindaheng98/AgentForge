import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { isPlainObject, mergePlainObjects, type PlainObject } from "./object.js";

export async function loadYamls(...paths: string[]): Promise<PlainObject> {
  if (paths.length === 0) {
    throw new Error("loadYamls requires at least one path");
  }

  let object: PlainObject = {};
  for (const path of paths) {
    const nextObject = parse(await readFile(path, "utf8")) as unknown;
    if (!isPlainObject(nextObject)) {
      throw new Error(`YAML file must contain an object: ${path}`);
    }
    object = mergePlainObjects(object, nextObject);
  }

  return object;
}
