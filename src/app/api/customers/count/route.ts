import { NextResponse } from 'next/server';
import { db } from '@/lib/cloudbase-server';

export async function GET() {
  try {
    // 尝试可能的客户集合名称
    const possibleCollections = ['shop_users', 'users', 'system_users', 'wx_users', 'customers'];
    let customerCount = 0;
    
    for (const collection of possibleCollections) {
      try {
        customerCount = await db.count(collection, {});
        console.log(`客户集合 ${collection} 中找到 ${customerCount} 条记录`);
        // 如果成功获取到数据，跳出循环
        break;
      } catch (err) {
        const error = err as Error;
        console.log(`客户集合 ${collection} 不存在或查询失败:`, error.message);
        // 继续尝试下一个集合
      }
    }
    
    return NextResponse.json({ 
      count: customerCount,
      success: true 
    });
  } catch (error) {
    console.error('获取客户总数失败:', error);
    return NextResponse.json(
      { 
        count: 0,
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}