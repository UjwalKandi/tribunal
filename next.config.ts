import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Kafka client out of the server bundle; it holds live sockets.
  serverExternalPackages: ["kafkajs"],
};

export default nextConfig;
