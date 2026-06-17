import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { isPlainObject, mergePlainObjects, type PlainObject } from "./object.js";

function expandYamlAliases(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(expandYamlAliases);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, expandYamlAliases(entry)]),
    );
  }
  return value;
}

export async function loadYamls(...paths: string[]): Promise<PlainObject> {
  if (paths.length === 0) {
    throw new Error("loadYamls requires at least one path");
  }

  let object: PlainObject = {};
  for (const path of paths) {
    const nextObject = expandYamlAliases(parse(await readFile(path, "utf8")));
    if (!isPlainObject(nextObject)) {
      throw new Error(`YAML file must contain an object: ${path}`);
    }
    object = mergePlainObjects(object, nextObject);
  }

  return object;
}
