import type { Metadata, Viewport } from "next";
import "./globals.css";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "TIET 2027 Community — Batch of 2027",
  description:
    "A private board for the placed TIET 2027 batch, grouped by the city they're relocating to. Verify your offer, find your batchmates, sort your flat.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-32.png",
    apple: "/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TIET 2027 Community",
  },
};

export const viewport: Viewport = {
  themeColor: "#12151C",
  width: "device-width",
  initialScale: 1,
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <div className="flex-1">
          <PageTransition>{children}</PageTransition>
        </div>
        <Footer />
        <InstallPrompt />
      </body>
    </html>
  );
}
