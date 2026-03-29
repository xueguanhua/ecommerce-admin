/**
 * 商品(SPU) CRUD 云函数
 * 数据表: shop_goods
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 统一响应格式
function success(data = null, message = 'success') {
  return { code: 0, message, data };
}

function error(message, code = -1) {
  return { code, message };
}

// 获取商品列表
async function getList(params) {
  const { page = 1, pageSize = 10, keyword = '', sellerId = '' } = params;
  const skip = (page - 1) * pageSize;
  
  let query = db.collection('shop_goods');
  
  // 构建查询条件
  const whereConditions = {};
  
  if (sellerId) {
    whereConditions.sellerId = sellerId;
  }
  
  if (keyword) {
    whereConditions.name = db.RegExp({ regexp: keyword, options: 'i' });
  }
  
  if (Object.keys(whereConditions).length > 0) {
    query = query.where(whereConditions);
  }

  const [listRes, countRes] = await Promise.all([
    query.skip(skip).limit(pageSize).orderBy('createTime', 'desc').get(),
    query.count()
  ]);

  return success({
    list: listRes.data,
    total: countRes.total,
    page,
    pageSize
  });
}

// 获取单个商品
async function getById(params) {
  const { id } = params;
  if (!id) return error('缺少商品 ID');

  const res = await db.collection('shop_goods').doc(id).get();
  if (!res.data) return error('商品不存在', 404);
  
  return success(res.data);
}

// 创建商品
async function create(params) {
  const { data } = params;
  
  if (!data) return error('缺少商品数据');
  if (!data.name?.trim()) return error('请输入商品名称');
  
  const now = db.serverDate();
  
  const goodsData = {
    name: data.name.trim(),
    description: data.description || '',
    images: data.images || [],
    sellerId: data.sellerId || 'default',
    price: data.price || 0,
    specs: data.specs || [],
    skus: data.skus || [],
    minPrice: data.minPrice || data.price || 0,
    maxPrice: data.maxPrice || data.price || 0,
    hasSpecs: data.hasSpecs || false,
    status: 'on_sale', // on_sale, off_sale, deleted
    createTime: now,
    updateTime: now,
  };

  const res = await db.collection('shop_goods').add({ data: goodsData });
  return success({ _id: res._id }, '创建成功');
}

// 更新商品
async function update(params) {
  const { id, data } = params;
  
  if (!id) return error('缺少商品 ID');
  if (!data) return error('缺少更新数据');
  
  const updateData = {
    ...data,
    updateTime: db.serverDate(),
  };
  
  // 移除不能更新的字段
  delete updateData._id;
  delete updateData.createTime;

  await db.collection('shop_goods').doc(id).update({ data: updateData });
  return success(null, '更新成功');
}

// 删除商品（软删除）
async function remove(params) {
  const { id } = params;
  if (!id) return error('缺少商品 ID');

  // 软删除，将状态改为 deleted
  await db.collection('shop_goods').doc(id).update({
    data: {
      status: 'deleted',
      updateTime: db.serverDate(),
    }
  });
  
  return success(null, '删除成功');
}

// 物理删除商品
async function hardDelete(params) {
  const { id } = params;
  if (!id) return error('缺少商品 ID');

  await db.collection('shop_goods').doc(id).remove();
  return success(null, '彻底删除成功');
}

// 更新商品状态
async function updateStatus(params) {
  const { id, status } = params;
  if (!id) return error('缺少商品 ID');
  if (!['on_sale', 'off_sale'].includes(status)) {
    return error('无效的状态值');
  }

  await db.collection('shop_goods').doc(id).update({
    data: {
      status,
      updateTime: db.serverDate(),
    }
  });
  
  return success(null, '状态更新成功');
}

// 按分类获取商品
async function getByCategory(params) {
  const { categoryId, page = 1, pageSize = 20 } = params;
  if (!categoryId) return error('缺少分类ID');

  const skip = (page - 1) * pageSize;
  
  const [listRes, countRes] = await Promise.all([
    db.collection('shop_goods')
      .where({
        categoryId: categoryId,
        status: 'on_sale'
      })
      .skip(skip)
      .limit(pageSize)
      .orderBy('createTime', 'desc')
      .get(),
    db.collection('shop_goods')
      .where({
        categoryId: categoryId,
        status: 'on_sale'
      })
      .count()
  ]);

  return success({
    spu: listRes.data,
    total: countRes.total,
    page,
    pageSize
  });
}

// 主入口
exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  console.log('goodsCrud called, action:', action, 'params:', params);

  try {
    switch (action) {
      case 'list': return await getList(params);
      case 'get': return await getById(params);
      case 'create': return await create(params);
      case 'update': return await update(params);
      case 'delete': return await remove(params);
      case 'hardDelete': return await hardDelete(params);
      case 'updateStatus': return await updateStatus(params);
      case 'getByCategory': return await getByCategory(params);
      default: return error(`未知操作: ${action}`);
    }
  } catch (e) {
    console.error('goodsCrud error:', e);
    return error(e.message || '服务器错误');
  }
};
