import crypto from "crypto";

export function ssha_pass(passwd: string, salt: string | null, next: any) {
  function _ssha(passwd: string, salt: string, next: any) {
    var ctx = crypto.createHash("sha1");
    ctx.update(passwd, "utf-8");
    ctx.update(salt, "binary");
    var digest = ctx.digest("binary");
    var ssha =
      "{SSHA}" + Buffer.from(digest + salt, "binary").toString("base64");
    return next(null, ssha);
  }
  if (next === undefined) {
    next = salt;
    salt = null;
  }
  if (salt === null) {
    crypto.randomBytes(32, function (ex, buf) {
      if (ex) return next(ex);
      _ssha(passwd, buf.toString("base64"), next);
      return null;
    });
  } else {
    _ssha(passwd, salt, next);
  }
  return null;
}

export const ssha_pass_async = (pass: string, salt: string = "salt") => {
  return new Promise<string>((resolve, reject) => {
    ssha_pass(pass, salt, (err: any, hash: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
};

export function checkssha(passwd: string, hash: string, next: any) {
  if (hash.substr(0, 6) != "{SSHA}") {
    return next(new Error("not {SSHA}"), false);
  }
  const bhash = Buffer.from(hash.substr(6), "base64");
  const salt = bhash.toString("binary", 20); // sha1 digests are 20 bytes long
  //console.log(salt)
  ssha_pass(passwd, salt, function (err: string, newssha: string) {
    if (err) return next(err);
    return next(null, hash === newssha);
  });
  return null;
}
