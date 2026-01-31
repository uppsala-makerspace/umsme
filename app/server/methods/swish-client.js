import { Meteor } from "meteor/meteor";
import https from "https";
import axios from "axios";
import fs from "fs";
import path from "path";

// Lazy-loaded swish client
let _swishClient = null;

// Get the app root directory (where meteor was started from)
const appRoot = process.env.PWD;

/**
 * Get the Swish axios client with certificates loaded.
 * Lazy-loaded on first access.
 */
export const getSwishClient = async () => {
  if (!_swishClient) {
    const config = Meteor.settings?.private?.swish;
    if (!config?.certPath || !config?.keyPath || !config?.caPath) {
      throw new Meteor.Error("config-error", "Swish certificate paths not configured");
    }

    // Resolve paths relative to app root
    const certPath = path.resolve(appRoot, config.certPath);
    const keyPath = path.resolve(appRoot, config.keyPath);
    const caPath = path.resolve(appRoot, config.caPath);

    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    const ca = fs.readFileSync(caPath);

    const agent = new https.Agent({
      cert,
      key,
      ca,
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
    });

    _swishClient = axios.create({
      httpsAgent: agent,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return _swishClient;
};
