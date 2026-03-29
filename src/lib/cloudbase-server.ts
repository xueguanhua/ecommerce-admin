/**
 * CloudBase Server SDK 初始化 (Node.js 环境)
 */

import cloudbase from '@cloudbase/node-sdk';

// 环境变量
const ENV_ID = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || process.env.TCB_ENV_ID || '';
const SECRET_ID = process.env.TCB_SECRET_ID || '';
const SECRET_KEY = process.env.TCB_SECRET_KEY || '';

let app: any = null;

export function getServerApp() {
  if (!app) {
    if (!ENV_ID) {
      throw new Error('CloudBase 环境ID未配置');
    }

    app = cloudbase.init({
      env: ENV_ID,
      credentials: {
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
      } as any,
    });
  }
  return app;
}

export const db = {
  /**
   * 查询记录
   */
  async query(collection: string, filter: Record<string, any> = {}, options: {
    limit?: number;
    skip?: number;
    orderBy?: { field: string; order: 'asc' | 'desc' };
  } = {}) {
    const app = getServerApp();
    const query = app.database().collection(collection);

    let result = query;

    // 构建查询条件
    if (Object.keys(filter).length > 0) {
      result = result.where(filter);
    }

    // 排序
    if (options.orderBy) {
      result = result.orderBy(options.orderBy.field, options.orderBy.order);
    }

    // 分页
    if (options.skip) {
      result = result.skip(options.skip);
    }
    if (options.limit) {
      result = result.limit(options.limit);
    }

    const data = await result.get();
    return data.data;
  },

  /**
   * 获取单条记录
   */
  async get(collection: string, id: string) {
    const app = getServerApp();
    const data = await app.database()
      .collection(collection)
      .doc(id)
      .get();
    return data.data[0] || null;
  },

  /**
   * 创建记录
   */
  async create(collection: string, data: Record<string, any>) {
    const app = getServerApp();
    const now = Date.now();
    const createData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const result = await app.database()
      .collection(collection)
      .add(createData);
    return result.id;
  },

  /**
   * 更新记录
   */
  async update(collection: string, id: string, data: Record<string, any>) {
    const app = getServerApp();
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    };
    await app.database()
      .collection(collection)
      .doc(id)
      .update(updateData);
    return true;
  },

  /**
   * 删除记录
   */
  async delete(collection: string, id: string) {
    const app = getServerApp();
    await app.database()
      .collection(collection)
      .doc(id)
      .remove();
    return true;
  },

  /**
   * 统计数量
   */
  async count(collection: string, filter: Record<string, any> = {}) {
    const app = getServerApp();
    let query = app.database().collection(collection);
    
    if (Object.keys(filter).length > 0) {
      query = query.where(filter);
    }
    
    const result = await query.count();
    return result.total;
  },
};
