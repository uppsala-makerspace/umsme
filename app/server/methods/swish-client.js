import https from "https";
import axios from "axios";
import fs from "fs";

export const agent = new https.Agent({
  cert: fs.readFileSync(Assets.absoluteFilePath("Swish_test_public_key.pem")),
  key: fs.readFileSync(Assets.absoluteFilePath("Swish_test_private_key.key")),
  ca: fs.readFileSync(Assets.absoluteFilePath("Swish_TLS_RootCA.pem")),
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.2",
});

export const swishClient = axios.create({
  httpsAgent: agent,
  headers: {
    "Content-Type": "application/json",
  },
});
