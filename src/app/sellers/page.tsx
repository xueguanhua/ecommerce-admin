'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { customerApi, type Customer } from '@/lib/wechat-cloud';
import { Search, Loader2, User as UserIcon, Phone, Calendar, Users } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, newToday: 0 });

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      console.log('加载客户列表...');
      const result = await customerApi.list({
        keyword: searchKeyword,
        status: statusFilter,
      });
      console.log('客户列表结果:', result);
      // 检查返回数据结构
      if (result?.code === 0) {
        setCustomers(result.data?.list || []);
      } else if (result?.list) {
        setCustomers(result.list);
      } else if (Array.isArray(result)) {
        setCustomers(result);
      } else {
        console.log('未知的数据格式:', result);
        setCustomers([]);
      }
    } catch (error) {
      console.error('加载客户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('加载客户统计...');
      const result = await customerApi.getStats();
      console.log('客户统计结果:', result);
      // 检查返回数据结构
      if (result?.code === 0) {
        const data = result.data;
        setStats({
          total: data?.total || 0,
          active: data?.active || 0,
          newToday: data?.newToday || 0,
        });
      } else if (result?.total !== undefined) {
        setStats({
          total: result.total || 0,
          active: result.active || 0,
          newToday: result.newToday || 0,
        });
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const handleSearch = () => {
    loadCustomers();
  };

  const handleStatusChange = async (customer: Customer) => {
    const newStatus = customer.status === 'active' ? 'banned' : 'active';
    try {
      await customerApi.updateStatus(customer._id, newStatus as any);
      setCustomers(customers.map(c =>
        c._id === customer._id ? { ...c, status: newStatus } : c
      ));
      loadStats();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchKeyword = !searchKeyword ||
      c.nickName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.phoneNumber?.includes(searchKeyword);
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchKeyword && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">正常</Badge>;
      case 'inactive':
        return <Badge variant="secondary">不活跃</Badge>;
      case 'banned':
        return <Badge variant="destructive">已封禁</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGenderText = (gender: number) => {
    switch (gender) {
      case 1: return '男';
      case 2: return '女';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">客户管理</h1>
          <p className="text-muted-foreground mt-1">管理小程序用户</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总用户数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <UserIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">活跃用户</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今日新增</p>
                <p className="text-2xl font-bold">{stats.newToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>客户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索昵称、手机号..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <select
              className="px-3 py-2 rounded-md border bg-background"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTimeout(loadCustomers, 0);
              }}
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="inactive">不活跃</option>
              <option value="banned">已封禁</option>
            </select>
            <Button onClick={handleSearch}>搜索</Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无客户数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户信息</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>登录次数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={customer.avatarUrl || '/default-avatar.png'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover bg-muted"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://cdn-we-retail.ym.tencent.com/miniapp/usercenter/icon-user-center-avatar@2x.png';
                          }}
                        />
                        <div>
                          <p className="font-medium">{customer.nickName || '微信用户'}</p>
                          <p className="text-xs text-muted-foreground">ID: {customer._id.slice(-8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.phoneNumber ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getGenderText(customer.gender)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.loginCount || 0} 次</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>
                      {customer.lastLoginTime
                        ? new Date(customer.lastLoginTime).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(customer.createTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={customer.status === 'active' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleStatusChange(customer)}
                      >
                        {customer.status === 'active' ? '封禁' : '解禁'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            共 {filteredCustomers.length} 个客户
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
