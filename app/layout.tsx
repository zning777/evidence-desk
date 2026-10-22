import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "溯证 · 个股证据工作台",
  description: "从研究问题出发，区分事实、分析与未知。美的集团公开财报研究原型。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
