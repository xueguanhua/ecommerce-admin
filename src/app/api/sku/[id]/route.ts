import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/cloudbase-server';

// GET /api/sku/[id] - 获取单个SKU
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await db.get('shop_sku', params.id);

    if (!data) {
      return NextResponse.json({
        code: -1,
        message: 'SKU不存在',
      }, { status: 404 });
    }

    return NextResponse.json({
      code: 0,
      message: 'success',
      data,
    });
  } catch (error: any) {
    console.error('获取SKU失败:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '获取失败',
    }, { status: 500 });
  }
}

// PUT /api/sku/[id] - 更新SKU
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // 检查SKU是否存在
    const existing = await db.get('shop_sku', params.id);
    if (!existing) {
      return NextResponse.json({
        code: -1,
        message: 'SKU不存在',
      }, { status: 404 });
    }

    await db.update('shop_sku', params.id, body);

    return NextResponse.json({
      code: 0,
      message: '更新成功',
    });
  } catch (error: any) {
    console.error('更新SKU失败:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '更新失败',
    }, { status: 500 });
  }
}

// DELETE /api/sku/[id] - 删除SKU
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete('shop_sku', params.id);

    return NextResponse.json({
      code: 0,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('删除SKU失败:', error);
    return NextResponse.json({
      code: -1,
      message: error.message || '删除失败',
    }, { status: 500 });
  }
}
