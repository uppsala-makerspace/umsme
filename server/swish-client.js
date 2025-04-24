import https from "https";
import axios from "axios";
import fs from "fs";

const agent = new https.Agent({
  cert: fs.readFileSync(Assets.absoluteFilePath("cert.pem")),
  key: fs.readFileSync(Assets.absoluteFilePath("key.pem")),
  ca: fs.readFileSync(Assets.absoluteFilePath("ca.pem")),
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.2",
});

export const swishClient = axios.create({
  httpsAgent: agent,
  headers: {
    "Content-Type": "application/json",
  },
});
