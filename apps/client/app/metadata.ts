import { Metadata } from "next";

import { env } from "@/src/env.mjs";

const APP_NAME = "UNAVI";
const DESCRIPTION = "An open metaverse platform";
const HERO = "/images/Hero.png";

export const baseMetadata: Metadata = {
  appleWebApp: {
    capable: true,
    startupImage: {
      url: "/images/Icon-512.png",
    },
    title: APP_NAME,
  },
  applicationName: APP_NAME,
  colorScheme: "light",
  description: DESCRIPTION,
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      {
        sizes: "192x192",
        url: "/images/Icon-192.png",
      },
    ],
    icon: "/images/Icon-512.png",
    shortcut: "/images/Icon-512.png",
  },
  keywords: ["Metaverse", "WebXR", "Gaming"],
  manifest: "/manifest.json",
  metadataBase: new URL(env.NEXT_PUBLIC_DEPLOYED_URL),
  openGraph: {
    description: DESCRIPTION,
    images: [
      {
        height: 500,
        url: HERO,
        width: 888,
      },
    ],
    siteName: APP_NAME,
    title: APP_NAME,
    type: "website",
  },
  themeColor: "#191919",
  title: { default: APP_NAME, template: `%s / ${APP_NAME}` },
  twitter: {
    card: "summary_large_image",
    description: DESCRIPTION,
    images: [HERO],
    site: "@unavi_xyz",
    title: APP_NAME,
  },
};