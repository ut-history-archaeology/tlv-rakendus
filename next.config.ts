import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/tlv-rakendus",
  images: { unoptimized: true },
};

export default nextConfig;