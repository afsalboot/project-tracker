import { Toaster } from "sonner";
import "./globals.css";

export const metadata = {
  title: { default: "Project Tracker", template: "%s · Project Tracker" },
  description: "A focused project and task workspace for individuals, teams, and organizations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
