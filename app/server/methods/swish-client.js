import https from "https";
import axios from "axios";

// Lazy-loaded swish client (Assets not available at module load time)
let _swishClient = null;

/**
 * Get the Swish axios client with certificates loaded.
 * Lazy-loaded on first access using Assets.getTextAsync.
 */
export const getSwishClient = async () => {
  if (!_swishClient) {
    const [cert, key, ca] = await Promise.all([
      Assets.getTextAsync("Swish_test_public_key.pem"),
      Assets.getTextAsync("Swish_test_private_key.key"),
      Assets.getTextAsync("Swish_TLS_RootCA.pem"),
    ]);

    console.log("cert: " + cert);
    console.log("key: " + key);
    console.log("ca: " + ca);

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
