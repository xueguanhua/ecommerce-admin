'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, MessageCircle, Users } from 'lucide-react';

// 模拟数据，实际应从 API 获取
const stats = [
  {
    title: '商品总数',
    value: '128',
    icon: Package,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    title: '订单总数',
    value: '56',
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'from-green-500/10 to-emerald-500/10',
  },
  {
    title: '消息总数',
    value: '234',
    icon: MessageCircle,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'from-orange-500/10 to-amber-500/10',
  },
  {
    title: '客户总数',
    value: '12',
    icon: Users,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'from-purple-500/10 to-pink-500/10',
  },
];

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
        
        <div className="relative">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            欢迎使用电商管理后台
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title} 
              className="card-hover card-glow overflow-hidden relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-50`} />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-foreground to-foreground/70">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">较昨日 +12%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/goods/new"
              className="block p-4 rounded-xl border bg-gradient-to-r from-primary/5 to-purple-500/5 hover:from-primary/10 hover:to-purple-500/10 transition-all duration-300 hover:scale-[1.02]"
            >
              <span className="font-medium">添加商品</span>
              <p className="text-sm text-muted-foreground mt-1">创建新的商品条目</p>
            </a>
            <a
              href="/goods"
              className="block p-4 rounded-xl border bg-gradient-to-r from-primary/5 to-purple-500/5 hover:from-primary/10 hover:to-purple-500/10 transition-all duration-300 hover:scale-[1.02]"
            >
              <span className="font-medium">管理商品</span>
              <p className="text-sm text-muted-foreground mt-1">查看、编辑或删除商品</p>
            </a>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              { label: '云开发环境', value: '已配置', status: 'success' },
              { label: '数据库', value: '已连接', status: 'success' },
              { label: '云存储', value: '正常', status: 'success' },
              { label: '云函数', value: '已部署', status: 'success' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="flex items-center gap-2 font-medium">
                  <span className={`w-2 h-2 rounded-full bg-${item.status === 'success' ? 'green-500' : 'red-500'}`} />
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
