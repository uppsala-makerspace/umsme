import { Meteor } from "meteor/meteor";
import fs from "fs";
import path from "path";

/**
 * A Google client signed in as a service account, for the given scopes: a
 * JWT from google-auth-library whose `request(opts)` attaches a fresh access
 * token. The config gives the account's key as `credentials` ({ client_email,
 * private_key }) or as a `keyFile` path (relative to PWD).
 */
export const serviceAccountClient = (config, scopes, name = "Google") => {
  // Imported lazily so that code which never asks for a client works without the dependency.
  const { JWT } = require("google-auth-library");
  let creds = config?.credentials;
  if (!creds && config?.keyFile) {
    creds = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, config.keyFile), "utf8"));
  }
  if (!creds?.client_email || !creds?.private_key) {
    throw new Meteor.Error("google-config", `${name} credentials are not configured`);
  }
  return new JWT({
    email: creds.client_email,
    // Tolerate keys whose newlines arrived escaped (literal "\n"), which is
    // common when the key is pasted into JSON/env. A real PEM needs actual
    // line breaks or OpenSSL fails with "DECODER routines::unsupported".
    key: creds.private_key.replace(/\\n/g, "\n"),
    scopes,
  });
};
