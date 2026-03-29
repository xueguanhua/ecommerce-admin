import { NextRequest, NextResponse } from 'next/server';

// 模拟用户数据（实际应从数据库获取）
const users = [
  {
    _id: '1',
    username: 'admin',
    password: 'admin123', // 实际应加密存储
    nickname: '管理员',
    role: 'admin',
    status: 'enabled',
    createTime: new Date('2024-01-01'),
  },
  {
    _id: '2',
    username: 'seller1',
    password: 'seller123',
    nickname: '商家1',
    role: 'seller',
    status: 'enabled',
    createTime: new Date('2024-01-02'),
  },
];

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        message: '请输入用户名和密码' 
      });
    }

    // 查找用户
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }

    if (user.status !== 'enabled') {
      return NextResponse.json({ 
        success: false, 
        message: '账号已被禁用' 
      });
    }

    // 返回用户信息（不返回密码）
    const { password: _, ...userInfo } = user;
    
    return NextResponse.json({ 
      success: true, 
      data: userInfo 
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
}
