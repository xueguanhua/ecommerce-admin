'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { userApi, type SystemUser } from '@/lib/wechat-cloud';
import { Search, Plus, Edit, Trash2, Loader2, User as UserIcon, Shield } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
    role: 'seller' as 'admin' | 'seller',
    status: 'enabled' as 'enabled' | 'disabled',
  });

  // 模拟数据
  const mockUsers: SystemUser[] = [
    {
      _id: '1',
      username: 'admin',
      nickname: '管理员',
      role: 'admin',
      status: 'enabled',
      createTime: new Date('2024-01-01'),
      updateTime: new Date('2024-01-01'),
    },
    {
      _id: '2',
      username: 'seller1',
      nickname: '商家1',
      role: 'seller',
      status: 'enabled',
      createTime: new Date('2024-01-02'),
      updateTime: new Date('2024-01-02'),
    },
    {
      _id: '3',
      username: 'seller2',
      nickname: '商家2',
      role: 'seller',
      status: 'disabled',
      createTime: new Date('2024-01-03'),
      updateTime: new Date('2024-01-03'),
    },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // 实际调用 API
      // const result = await userApi.list();
      // setUsers(result?.data || []);
      
      setTimeout(() => {
        setUsers(mockUsers);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('加载用户失败:', error);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nickname: '',
      role: 'seller',
      status: 'enabled',
    });
    setEditingUser(null);
  };

  const handleOpenModal = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        nickname: user.nickname,
        role: user.role,
        status: user.status,
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      alert('请输入用户名');
      return;
    }
    if (!editingUser && !formData.password) {
      alert('请输入密码');
      return;
    }
    if (!formData.nickname.trim()) {
      alert('请输入昵称');
      return;
    }

    try {
      setSaving(true);
      
      if (editingUser) {
        // 更新
        setUsers(users.map(u => 
          u._id === editingUser._id 
            ? { 
                ...u, 
                nickname: formData.nickname,
                role: formData.role,
                status: formData.status,
                updateTime: new Date() 
              }
            : u
        ));
      } else {
        // 创建
        const newUser: SystemUser = {
          _id: Date.now().toString(),
          username: formData.username,
          nickname: formData.nickname,
          role: formData.role,
          status: formData.status,
          createTime: new Date(),
          updateTime: new Date(),
        };
        setUsers([...users, newUser]);
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    
    setUsers(users.filter(u => u._id !== id));
  };

  const handleStatusChange = async (user: SystemUser) => {
    const newStatus = user.status === 'enabled' ? 'disabled' : 'enabled';
    setUsers(users.map(u => 
      u._id === user._id ? { ...u, status: newStatus } : u
    ));
  };

  const filteredUsers = users.filter(u => {
    const matchKeyword = !searchKeyword || 
      u.username.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.nickname.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchKeyword && matchRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-muted-foreground mt-1">管理系统用户</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          添加用户
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、昵称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="px-3 py-2 rounded-md border bg-background"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">全部角色</option>
              <option value="admin">管理员</option>
              <option value="seller">商家</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无用户</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>{user.nickname}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role === 'admin' ? '管理员' : '商家'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'enabled' ? 'default' : 'secondary'}>
                        {user.status === 'enabled' ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.createTime.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(user)}
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(user)}
                          title={user.status === 'enabled' ? '禁用' : '启用'}
                        >
                          {user.status === 'enabled' ? '禁用' : '启用'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user._id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            共 {filteredUsers.length} 个用户
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[450px]">
            <CardHeader>
              <CardTitle>{editingUser ? '编辑用户' : '添加用户'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>用户名 *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="请输入用户名"
                    disabled={!!editingUser}
                    required
                  />
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label>密码 *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="请输入密码"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>昵称 *</Label>
                  <Input
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="请输入昵称"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>角色</Label>
                  <select
                    className="w-full px-3 py-2 rounded-md border bg-background"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  >
                    <option value="admin">管理员</option>
                    <option value="seller">商家</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="user-status"
                    checked={formData.status === 'enabled'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'enabled' : 'disabled' })}
                  />
                  <Label htmlFor="user-status" className="cursor-pointer">启用</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
