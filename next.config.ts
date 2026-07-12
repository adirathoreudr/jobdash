  // @react-pdf/renderer and pdf.js (via unpdf) pull in optional native/canvas
  // dependencies that must not be bundled for the server runtime.
const nextConfig: NextConfig = {
  // @react-pdf/renderer and pdf.js (via unpdf) pull in optional native/canvas deps
  // that must not be bundled for the server runtime.
  serverExternalPackages: ["@react-pdf/renderer", "unpdf"],
  experimental: {
    // Allow larger resume/JD payloads to server actions & route handlers.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
