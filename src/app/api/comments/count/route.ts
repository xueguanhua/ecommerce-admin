import { NextResponse } from 'next/server';
import { db } from '@/lib/cloudbase-server';

export async function GET() {
  try {
    // 尝试可能的评论集合名称
    const possibleCollections = ['shop_comments', 'comments', 'product_comments', 'goods_comments'];
    let commentCount = 0;
    
    for (const collection of possibleCollections) {
      try {
        commentCount = await db.count(collection, {});
        console.log(`评论集合 ${collection} 中找到 ${commentCount} 条记录`);
        // 如果成功获取到数据，跳出循环
        break;
      } catch (err) {
        const error = err as Error;
        console.log(`评论集合 ${collection} 不存在或查询失败:`, error.message);
        // 继续尝试下一个集合
      }
    }
    
    return NextResponse.json({ 
      count: commentCount,
      success: true 
    });
  } catch (error) {
    console.error('获取评论总数失败:', error);
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