import type { Metadata } from "next";
import "./globals.css";
import Providers from "../components/dashboard/providers";

export const metadata: Metadata = {
  title: "PingMate – Your Inbox Reminder Buddy",
  description:
    "PingMate scans your inbox, extracts important deadlines, and sends WhatsApp reminders before it's too late.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
