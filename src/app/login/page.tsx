'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.password) {
      setError('请输入用户名和密码');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // 保存用户信息
        localStorage.setItem('user', JSON.stringify(result.data));
        router.push('/goods');
      } else {
        setError(result.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-purple-500/20 animate-gradient" />
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      <Card className="w-full max-w-md relative backdrop-blur-xl bg-white/80 border-white/20 shadow-2xl shadow-primary/20">
        <CardHeader className="text-center space-y-4 pb-8">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 animate-glow">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              电商管理后台
            </CardTitle>
            <CardDescription className="mt-2">请输入用户名和密码登录</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  className="pl-10 h-11 bg-white/50 backdrop-blur border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">密码</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  className="pl-10 h-11 bg-white/50 backdrop-blur border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center animate-pulse">{error}</p>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 btn-gradient rounded-xl" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? '登录中...' : '立即登录'}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
            <p className="text-xs text-center text-muted-foreground">
              默认账号: <span className="font-medium text-primary">admin</span> / <span className="font-medium text-primary">admin123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
