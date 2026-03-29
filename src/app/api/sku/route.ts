import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/cloudbase-server';

// GET /api/sku - 获取SKU列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const spuId = searchParams.get('spuId');
    const search = searchParams.get('search');

    const filter: Record<string, any> = {};
    
    // 按SPU筛选
    if (spuId) {
      filter['spu._id'] = spuId;
    }

    // 搜索描述
    if (search) {
      filter.description = { $regex: search };
    }

    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      db.query('shop_sku', filter, {
        limit: pageSize,
        skip,
        orderBy: { field: 'createdAt', order: 'desc' },
      }),
      db.count('shop_sku', filter),
    ]);

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        page,
        pageSize,
      },
    });
  } catch (error: any) {
    console.error('获取SKU列表失败:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '获取失败',
    }, { status: 500 });
  }
}

// POST /api/sku - 创建SKU
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (typeof body.price !== 'number') {
      return NextResponse.json({
        code: -1,
        message: '请填写金额',
      }, { status: 400 });
    }

    if (typeof body.count !== 'number') {
      return NextResponse.json({
        code: -1,
        message: '请填写库存',
      }, { status: 400 });
    }

    const id = await db.create('shop_sku', {
      ...body,
    });

    return NextResponse.json({
      code: 0,
      message: '创建成功',
      data: { _id: id },
    });
  } catch (error: any) {
    console.error('创建SKU失败:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '创建失败',
    }, { status: 500 });
  }
}
