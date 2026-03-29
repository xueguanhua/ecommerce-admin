'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, MessageCircle, Users, Loader2 } from 'lucide-react';
import { goodsApi, skuApi, commentApi, orderApi } from '@/lib/wechat-cloud';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StatsData {
  goodsCount: number;
  orderCount: number;
  commentCount: number;
  userCount: number;
}

interface DailyOrderData {
  date: string;
  count: number;
  amount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData>({
    goodsCount: 0,
    orderCount: 0,
    commentCount: 0,
    userCount: 0,
  });
  const [dailyOrders, setDailyOrders] = useState<DailyOrderData[]>([
    { date: '03-24', count: 12, amount: 2400 },
    { date: '03-25', count: 19, amount: 3800 },
    { date: '03-26', count: 15, amount: 3000 },
    { date: '03-27', count: 25, amount: 5000 },
    { date: '03-28', count: 22, amount: 4400 },
    { date: '03-29', count: 18, amount: 3600 },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Dashboard] 开始获取统计数据...');

      // 并行获取各项统计数据
      const [goodsRes, skuRes, commentRes, userRes, orderStatsRes] = await Promise.allSettled([
        goodsApi.list({ limit: 0, skip: 0 }),     // 商品总数，limit=0 表示不返回列表只获取总数
        skuApi.list({ limit: 0, skip: 0 }),       // SKU总数，limit=0 表示不返回列表只获取总数
        fetch('/api/comments/count').then(r => r.json()).catch(() => ({ count: 0 })), // 评论总数
        fetch('/api/customers/count').then(r => r.json()).catch(() => ({ count: 0 })), // 客户总数
        orderApi.stats().catch(() => ({ daily: [] })), // 订单统计数据
      ]);

      // 打印各项结果
      console.log('[Dashboard] goodsRes:', goodsRes);
      console.log('[Dashboard] skuRes:', skuRes);
      console.log('[Dashboard] commentRes:', commentRes);
      console.log('[Dashboard] userRes:', userRes);
      console.log('[Dashboard] orderStatsRes:', orderStatsRes);

      // 解析商品数量
      let goodsCount = 0;
      if (goodsRes.status === 'fulfilled' && goodsRes.value) {
        console.log('[Dashboard] goodsRes.value:', goodsRes.value);
        // 假设响应结构为 { data: { total: number, list: [...] } }
        goodsCount = goodsRes.value?.data?.total || 0;
      } else if (goodsRes.status === 'rejected') {
        console.error('[Dashboard] goodsRes rejected:', goodsRes.reason);
      }

      // 解析SKU数量
      let orderCount = 0;
      if (skuRes.status === 'fulfilled' && skuRes.value) {
        console.log('[Dashboard] skuRes.value:', skuRes.value);
        orderCount = skuRes.value?.data?.total || 0;
      } else if (skuRes.status === 'rejected') {
        console.error('[Dashboard] skuRes rejected:', skuRes.reason);
      }

      // 解析评论数量
      let commentCount = 0;
      if (commentRes.status === 'fulfilled' && commentRes.value) {
        console.log('[Dashboard] commentRes.value:', commentRes.value);
        commentCount = commentRes.value?.count || 0;
      } else if (commentRes.status === 'rejected') {
        console.error('[Dashboard] commentRes rejected:', commentRes.reason);
      }

      // 解析客户数量
      let userCount = 0;
      if (userRes.status === 'fulfilled' && userRes.value) {
        console.log('[Dashboard] userRes.value:', userRes.value);
        userCount = userRes.value?.count || 0;
      } else if (userRes.status === 'rejected') {
        console.error('[Dashboard] userRes rejected:', userRes.reason);
      }

      // 解析订单统计数据
      let newDailyOrders = dailyOrders; // 默认使用现有模拟数据
      if (orderStatsRes.status === 'fulfilled' && orderStatsRes.value) {
        console.log('[Dashboard] orderStatsRes.value:', orderStatsRes.value);
        // 假设响应结构为 { daily: [{ date: string, count: number, amount: number }, ...] }
        const dailyData = orderStatsRes.value?.daily || orderStatsRes.value?.data?.daily || [];
        if (dailyData.length > 0) {
          // 转换数据格式以匹配图表
          newDailyOrders = dailyData.map((item: any) => ({
            date: item.date ? item.date.split('-').slice(1).join('-') : '未知', // 格式化为 MM-DD
            count: item.count || 0,
            amount: item.amount || item.totalAmount || 0,
          }));
        }
      } else if (orderStatsRes.status === 'rejected') {
        console.error('[Dashboard] orderStatsRes rejected:', orderStatsRes.reason);
      }

      console.log('[Dashboard] 最终统计数据:', { goodsCount, orderCount, commentCount, userCount });

      setStats({
        goodsCount,
        orderCount,
        commentCount,
        userCount,
      });
      setDailyOrders(newDailyOrders);
    } catch (err) {
      console.error('获取统计数据失败:', err);
      setError('获取数据失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: '商品总数',
      value: stats.goodsCount,
      icon: Package,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-500/10 to-cyan-500/10',
    },
    {
      title: 'SKU总数',
      value: stats.orderCount,
      icon: ShoppingCart,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-500/10 to-emerald-500/10',
    },
    {
      title: '评论总数',
      value: stats.commentCount,
      icon: MessageCircle,
      color: 'from-orange-500 to-amber-500',
      bgColor: 'from-orange-500/10 to-amber-500/10',
    },
    {
      title: '客户总数',
      value: stats.userCount,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-500/10 to-pink-500/10',
    },
  ];

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

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20" />
                <div className="h-8 w-8 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-3 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
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
      )}

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
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              每日订单统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailyOrders}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value, name) => {
                      if (name === 'count') return [`${value} 单`, '订单数'];
                      if (name === 'amount') return [`¥${value}`, '金额'];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => {
                      if (value === 'count') return '订单数';
                      if (value === 'amount') return '金额';
                      return value;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="订单数" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar 
                    dataKey="amount" 
                    name="金额" 
                    fill="hsl(var(--purple))" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
