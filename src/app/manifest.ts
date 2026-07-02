import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "sift.",
    short_name: "sift.",
    description: "A well-kept ledger for your money.",
    start_url: "/",
    display: "standalone",
    background_color: "#E5E4DA",
    theme_color: "#1E3A2D",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
