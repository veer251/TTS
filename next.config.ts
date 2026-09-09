import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle msedge-tts (and its native `ws` websocket dependency);
  // load it at runtime from node_modules so the websocket works correctly.
  serverExternalPackages: ["msedge-tts"],
};

export default nextConfig;
