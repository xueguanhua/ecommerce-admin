/**
 * SKU 云函数
 * 处理商品SKU的CRUD操作
 * 
 * 调用方式: wx.cloud.callFunction({ name: 'skuCrud', data: { action: 'xxx', ... } })
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 统一返回格式
 */
function success(data = null, message = 'success') {
  return { code: 0, message, data };
}

function error(message, code = -1) {
  return { code, message };
}

/**
 * SKU 列表
 */
async function getList(params) {
  const { page = 1, pageSize = 10, search = '', spuId = '' } = params;
  const skip = (page - 1) * pageSize;
  
  let query = db.collection('shop_sku');
  
  // 按SPU筛选
  if (spuId) {
    query = query.where({
      'spu._id': spuId
    });
  }
  
  // 搜索描述
  if (search) {
    query = query.where({
      description: db.RegExp({ regexp: search })
    });
  }
  
  // 并行查询列表和总数
  const [listRes, countRes] = await Promise.all([
    query.skip(skip).limit(pageSize).orderBy('createdAt', 'desc').get(),
    query.count()
  ]);
  
  return success({
    list: listRes.data,
    total: countRes.total,
    page,
    pageSize
  });
}

/**
 * 获取单个SKU
 */
async function getById(params) {
  const { id } = params;
  
  if (!id) {
    return error('缺少SKU ID');
  }
  
  const res = await db.collection('shop_sku').doc(id).get();
  
  if (!res.data) {
    return error('SKU不存在', 404);
  }
  
  return success(res.data);
}

/**
 * 创建SKU
 */
async function create(params) {
  const { data } = params;
  
  if (!data) {
    return error('缺少商品数据');
  }
  
  // 验证必填字段
  if (typeof data.price !== 'number') {
    return error('请填写金额');
  }
  
  if (typeof data.count !== 'number') {
    return error('请填写库存');
  }
  
  // 添加创建时间
  const createData = {
    ...data,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };
  
  const res = await db.collection('shop_sku').add({
    data: createData
  });
  
  return success({ _id: res._id }, '创建成功');
}

/**
 * 更新SKU
 */
async function update(params) {
  const { id, data } = params;
  
  if (!id) {
    return error('缺少SKU ID');
  }
  
  if (!data) {
    return error('缺少更新数据');
  }
  
  // 检查是否存在
  const existing = await db.collection('shop_sku').doc(id).get();
  if (!existing.data) {
    return error('SKU不存在', 404);
  }
  
  // 添加更新时间
  const updateData = {
    ...data,
    updatedAt: db.serverDate()
  };
  
  await db.collection('shop_sku').doc(id).update({
    data: updateData
  });
  
  return success(null, '更新成功');
}

/**
 * 删除SKU
 */
async function remove(params) {
  const { id } = params;
  
  if (!id) {
    return error('缺少SKU ID');
  }
  
  await db.collection('shop_sku').doc(id).remove();
  
  return success(null, '删除成功');
}

/**
 * 批量删除SKU
 */
async function batchDelete(params) {
  const { ids } = params;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return error('缺少SKU ID列表');
  }
  
  const promises = ids.map(id => 
    db.collection('shop_sku').doc(id).remove()
  );
  
  await Promise.all(promises);
  
  return success(null, `已删除${ids.length}个SKU`);
}

/**
 * 更新库存（增加/减少）
 */
async function updateStock(params) {
  const { id, count, type = 'reduce' } = params;
  
  if (!id) {
    return error('缺少SKU ID');
  }
  
  if (typeof count !== 'number' || count <= 0) {
    return error('请填写有效的库存数量');
  }
  
  // 检查是否存在
  const existing = await db.collection('shop_sku').doc(id).get();
  if (!existing.data) {
    return error('SKU不存在', 404);
  }
  
  const currentStock = existing.data.count || 0;
  let newStock;
  
  if (type === 'add') {
    newStock = currentStock + count;
  } else {
    newStock = currentStock - count;
    if (newStock < 0) {
      return error('库存不足');
    }
  }
  
  await db.collection('shop_sku').doc(id).update({
    data: {
      count: newStock,
      updatedAt: db.serverDate()
    }
  });
  
  return success({ count: newStock }, '库存更新成功');
}

/**
 * 批量更新库存
 */
async function batchUpdateStock(params) {
  const { items } = params;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return error('缺少库存更新数据');
  }
  
  const results = [];
  
  for (const item of items) {
    const { id, count, type = 'reduce' } = item;
    
    if (!id) continue;
    
    try {
      const existing = await db.collection('shop_sku').doc(id).get();
      if (!existing.data) continue;
      
      const currentStock = existing.data.count || 0;
      let newStock;
      
      if (type === 'add') {
        newStock = currentStock + count;
      } else {
        newStock = currentStock - count;
        if (newStock < 0) newStock = 0;
      }
      
      await db.collection('shop_sku').doc(id).update({
        data: {
          count: newStock,
          updatedAt: db.serverDate()
        }
      });
      
      results.push({ id, success: true, count: newStock });
    } catch (e) {
      results.push({ id, success: false, error: e.message });
    }
  }
  
  return success(results);
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  console.log('skuCrud called, action:', action);
  
  try {
    switch (action) {
      case 'list':
        return await getList(params);
      case 'get':
        return await getById(params);
      case 'create':
        return await create(params);
      case 'update':
        return await update(params);
      case 'delete':
        return await remove(params);
      case 'batchDelete':
        return await batchDelete(params);
      case 'updateStock':
        return await updateStock(params);
      case 'batchUpdateStock':
        return await batchUpdateStock(params);
      default:
        return error(`未知的操作: ${action}`);
    }
  } catch (e) {
    console.error('skuCrud error:', e);
    return error(e.message || '服务器错误');
  }
};
