import _ from "lodash";

interface LoDashMixins extends _.LoDashStatic {
  deepDiff: typeof deepDiff;
}

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

/**
 * Deep diff between two object-likes
 */
function deepDiff(fromObject: object, toObject: object) {
  const changes: { [x: string]: any } = {};

  // @ts-ignore
  const buildPath = (path?: string, obj: any, key: string) =>
    _.isUndefined(path) ? key : `${path}.${key}`;

  const walk = (fromObject: object, toObject: object, path?: string) => {
    for (const key of _.keys(fromObject)) {
      const currentPath = buildPath(path, fromObject, key);
      if (!_.has(toObject, key)) {
        changes[currentPath] = { from: _.get(fromObject, key) };
      }
    }

    for (const [key, to] of _.entries(toObject)) {
      const currentPath = buildPath(path, toObject, key);
      if (!_.has(fromObject, key)) {
        changes[currentPath] = { to };
      } else {
        const from = _.get(fromObject, key);
        if (!_.isEqual(from, to)) {
          if (_.isObjectLike(to) && _.isObjectLike(from)) {
            walk(from, to, currentPath);
          } else {
            changes[currentPath] = { from, to };
          }
        }
      }
    }
  };

  walk(fromObject, toObject);

  return changes;
}

_.mixin({ deepDiff });

export const lodash = <LoDashMixins>(<unknown>_);

/**
 * Convert ldap entry dn to object
 */
export function ldap_dn_entry_to_object(dn: string) {
  return dn
    .trim()
    .split(",")
    .reduce((acc, att) => {
      const satt = att.split("=");
      const key = satt[0].trim();
      if (acc[key] && !Array.isArray(acc[key])) acc[key] = [<string>acc[key]];
      if (Array.isArray(acc[key])) {
        // @ts-ignore
        acc[key].push(satt[1].trim());
      } else {
        acc[key] = satt[1].trim();
      }
      return acc;
    }, <{ [cn: string]: string | string[] }>{});
}
