'use client';

import Sidebar from '@/components/Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, User, Loader2, Menu } from 'lucide-react';

export default function ClientApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 登录页面不需要侧边栏和header
  const isLoginPage = pathname === '/login' || pathname.startsWith('/login/');

  useEffect(() => {
    // 检查是否已登录
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else if (!isLoginPage) {
      // 未登录且不是登录页，跳转登录
      router.push('/login');
    }
    setLoading(false);
  }, [pathname, router, isLoginPage]);

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 登录页面不显示侧边栏和header
  if (isLoginPage) {
    return <>{children}</>;
  }

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="flex min-h-screen">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      {/* 主内容区 */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-18 bg-gradient-to-r from-background via-background/95 to-background border-b shadow-sm backdrop-blur-xl">
          <div className="h-16 flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1" />
            
            {/* 用户信息 */}
            <div className="flex items-center gap-4">
              {/* 搜索框 */}
              <div className="hidden md:flex items-center">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="搜索..."
                    className="w-48 h-9 pl-9 pr-4 rounded-xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary/30 focus:bg-muted transition-all duration-300 text-sm placeholder:text-muted-foreground/50"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </div>
              
              {/* 用户头像和信息 */}
              <div className="flex items-center gap-3 pl-4 border-l border-border/50">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 transition-all duration-300 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/20">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{user?.nickname || user?.username || '用户'}</span>
                  {user?.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full shadow-sm">
                      管理员
                    </span>
                  )}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-300 rounded-xl"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  退出
                </Button>
              </div>
            </div>
          </div>
          
          {/* 装饰性底部渐变线 */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-background via-background to-primary/[0.02] overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t bg-gradient-to-r from-background via-muted/30 to-background shrink-0">
          <div className="px-4 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium">电商管理后台</span>
              <span className="text-border">|</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span>云服务: <span className="text-green-500">已连接</span></span>
              <span className="text-border">|</span>
              <span>环境: {process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '未配置'}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
