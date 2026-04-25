/**
 * Status / liveness endpoint.
 *
 * Answers a single question: is the payment service process up and serving
 * HTTP? No DB ping, no Swish reachability check — those are different
 * failure modes. The app's `payment.initiate` method probes this before
 * starting a Swish handshake so users don't end up paying through a Swish
 * callback that lands on a dead host.
 */

import { WebApp } from "meteor/webapp";

WebApp.handlers.use("/status", async (req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Only GET is supported");
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});
