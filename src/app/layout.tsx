import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confraternização CAGE 2026",
  description: "Plataforma de gestão da confraternização de fim de ano da CAGE",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
