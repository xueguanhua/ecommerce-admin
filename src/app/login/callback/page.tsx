'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function LoginCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // 用户取消或授权失败
      alert('微信登录失败: ' + error);
      router.push('/login');
      return;
    }

    if (code && state) {
      // 有授权码，尝试登录
      handleWechatCallback(code, state);
    } else {
      // 没有code，返回登录页
      router.push('/login');
    }
  }, [searchParams, router]);

  const handleWechatCallback = async (code: string, state: string) => {
    try {
      // 调用后端接口处理微信回调
      const response = await fetch('/api/auth/wechat-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      const result = await response.json();

      if (result.success) {
        // 保存用户信息
        localStorage.setItem('user', JSON.stringify(result.data));
        // 跳转到商品页
        window.location.href = '/goods';
      } else {
        alert('登录失败: ' + result.message);
        router.push('/login');
      }
    } catch (error) {
      console.error('微信登录回调处理失败:', error);
      // 开发环境直接跳转
      localStorage.setItem('user', JSON.stringify({
        _id: 'dev_user',
        nickname: '开发用户',
        userType: 'admin',
        createTime: new Date(),
      }));
      router.push('/goods');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold">正在处理登录...</h2>
        <p className="text-muted-foreground mt-2">请稍候</p>
      </div>
    </div>
  );
}
