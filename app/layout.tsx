import type { Metadata } from "next";
import "./globals.css";

// 💡 這裡就是修改您在 LINE 傳送網址時，預覽卡片的「標題」與「敘述」的地方！
export const metadata: Metadata = {
  title: "辯論社線上集點系統", // 填入您想顯示的「大標題」
  description: "思無界，辯無限。登入系統查看您的論點餘額與兌換獎品。", // 填入您想顯示的「小說明敘述」
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
