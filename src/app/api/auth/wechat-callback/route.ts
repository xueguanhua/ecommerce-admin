import { NextRequest, NextResponse } from 'next/server';

const WECHAT_OPEN_APP_ID = process.env.NEXT_PUBLIC_WECHAT_APP_ID || '';
const WECHAT_OPEN_SECRET = process.env.WECHAT_OPEN_APP_SECRET || '';

// 微信开放平台 access_token 缓存
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getWechatAccessToken(): Promise<string> {
  // 检查缓存
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  // 调用微信接口获取 access_token
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_OPEN_APP_ID}&secret=${WECHAT_OPEN_SECRET}&code=$CODE_PLACEHOLDER&grant_type=authorization_code`;
  
  // 注意：这里需要替换实际code
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, message: '缺少授权码' });
    }

    if (!WECHAT_OPEN_APP_ID || !WECHAT_OPEN_SECRET) {
      // 开发环境：模拟登录成功
      return NextResponse.json({
        success: true,
        data: {
          _id: 'dev_user_' + Date.now(),
          openid: 'dev_openid',
          nickname: '开发用户',
          userType: 'admin',
          createTime: new Date(),
        },
      });
    }

    // 用 code 换取 access_token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_OPEN_APP_ID}&secret=${WECHAT_OPEN_SECRET}&code=${code}&grant_type=authorization_code`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      return NextResponse.json({ 
        success: false, 
        message: `微信授权失败: ${tokenData.errmsg}` 
      });
    }

    const accessToken = tokenData.access_token;
    const openid = tokenData.openid;

    // 用 access_token 获取用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
    const userInfoRes = await fetch(userInfoUrl);
    const userInfo = await userInfoRes.json();

    // 创建或更新用户（这里需要调用云函数或直接操作数据库）
    // 简化处理，直接返回用户信息
    const user = {
      _id: openid,
      openid,
      nickname: userInfo.nickname || '微信用户',
      avatar: userInfo.headimgurl || '',
      userType: 'admin' as const,
      createTime: new Date(),
    };

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('微信登录回调处理错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' });
  }
}
