/**
 * 云函数代理 API
 * 前端通过这个路由调用云函数，避免匿名登录权限问题
 */

import { NextRequest, NextResponse } from 'next/server';

// 从服务端调用云函数（使用 HTTP 触发器）
async function callCloudFunctionFromServer(name: string, data: any) {
  const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
  
  console.log(`[Server] 环境ID:`, envId);
  console.log(`[Server] 环境变量:`, {
    CLOUDBASE_ENV_ID: process.env.CLOUDBASE_ENV_ID,
    NEXT_PUBLIC_CLOUDBASE_ENV_ID: process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID,
  });
  
  if (!envId) {
    throw new Error('CloudBase 环境ID未配置，请检查 .env.local 文件');
  }

  // 使用 HTTP 触发器方式调用
  const url = `https://${envId}.service.tcloudbase.com/${name}`;
  
  console.log(`[Server] 调用云函数 ${name} 到 ${url}`);
  console.log(`[Server] 请求数据:`, data);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    console.log(`[Server] 响应状态:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`调用失败: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (fetchError) {
    console.error(`[Server] fetch 错误:`, fetchError);
    throw new Error(`无法连接到云函数: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}。请检查：1. 云函数是否开启 HTTP 触发器 2. 环境ID是否正确 3. 网络连接`);
  }
}

// 处理 POST 请求
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> | { name: string } }
) {
  try {
    // 兼容不同 Next.js 版本的 params 处理方式
    const resolvedParams = await Promise.resolve(params);
    const name = resolvedParams.name;
    
    console.log(`[API] 收到请求，云函数名: ${name}`);
    
    if (!name) {
      throw new Error('云函数名称不能为空');
    }
    
    const body = await request.json();
    console.log(`[API] 调用云函数 ${name}:`, body);

    // 调用云函数
    const result = await callCloudFunctionFromServer(name, body);
    
    console.log(`[API] 云函数返回:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] 云函数调用失败:', error);
    return NextResponse.json(
      { 
        code: -1, 
        message: error instanceof Error ? error.message : '调用失败',
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// 处理 GET 请求
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> | { name: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const name = resolvedParams.name;
    const { searchParams } = new URL(request.url);
    const data = Object.fromEntries(searchParams.entries());

    const result = await callCloudFunctionFromServer(name, data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] 云函数调用失败:', error);
    return NextResponse.json(
      { code: -1, message: '调用失败', error: String(error) },
      { status: 500 }
    );
  }
}
