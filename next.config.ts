import type { NextConfig } from "next";

// `next dev` 403s its own /_next chunks for any origin other than localhost,
// so opening the deck from a phone via the machine's LAN IP renders the HTML
// but never hydrates (dead menu, theme toggle, etc.). Allow private-network
// origins; production (`next start`) ignores this option.
const privateLan = [
  "192.168.*.*",
  "10.*.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  "*.local",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: privateLan,
};

export default nextConfig;
