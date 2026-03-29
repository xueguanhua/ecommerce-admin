'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageCircle,
  Users,
  Settings,
  Menu,
  X,
  Image,
  Star,
  FolderTree,
  UserCog,
  ChevronLeft,
  ChevronRight,
  TestTube,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

const sidebarItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/goods', label: '商品管理', icon: Package },
  { href: '/categories', label: '分类管理', icon: FolderTree },
  { href: '/activities', label: '主题活动', icon: Sparkles },
  { href: '/comments', label: '评论管理', icon: Star },
  { href: '/banners', label: '轮播图管理', icon: Image },
  { href: '/orders', label: '订单管理', icon: ShoppingCart },
  { href: '/messages', label: '消息管理', icon: MessageCircle },
  { href: '/sellers', label: '客户管理', icon: Users },
  { href: '/users', label: '用户管理', icon: UserCog },
  { href: '/settings', label: '系统设置', icon: Settings },
  { href: '/sku-test', label: 'SKU测试', icon: TestTube },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-card to-card/95 border-r shadow-2xl shadow-primary/5 transform transition-all duration-300 ease-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Decorative gradient blob */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          
          {/* Logo */}
          <div className={cn("h-20 flex items-center border-b/50 relative", isCollapsed ? "justify-center px-2" : "px-6")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            {!isCollapsed && (
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent ml-3">
                电商管理
              </h1>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 p-4 space-y-2", isCollapsed && "p-2")}>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden',
                    isCollapsed ? 'justify-center p-3' : 'px-4 py-3',
                    isActive
                      ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:bg-gradient-to-r hover:from-accent hover:to-accent/50 hover:text-foreground'
                  )}
                >
                  {/* Hover glow effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-purple-500/5 transition-all duration-300" />
                  )}
                  <Icon 
                    size={18} 
                    className={cn(
                      'transition-transform duration-300 shrink-0',
                      !isActive && 'group-hover:scale-110 group-hover:rotate-3'
                    )} 
                  />
                  {!isCollapsed && <span className="relative">{item.label}</span>}
                  {isActive && !isCollapsed && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle */}
          <div className="p-4 border-t/50">
            <button
              onClick={onToggle}
              className={cn(
                "w-full flex items-center justify-center gap-2 p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-300",
                isCollapsed && "justify-center"
              )}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {!isCollapsed && <span className="text-sm">收起</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
