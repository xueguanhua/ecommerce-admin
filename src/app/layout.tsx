import './globals.css';

export const metadata = {
  title: '电商管理后台',
  description: '电商小程序管理后台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}
