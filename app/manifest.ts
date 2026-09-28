import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "INVEST OS",
    short_name: "Invest OS",
    description: "Your investment research workspace",
    start_url: "/login",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#202b40",
    icons: [
      {
        src: "/invest-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
