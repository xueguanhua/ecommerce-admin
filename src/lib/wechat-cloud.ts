/**
 * 腾讯云 CloudBase SDK 客户端
 * 文档：https://docs.cloudbase.net/api-reference/webv2/initialization
 */

import { callCloudFunction as cloudCallFn, uploadFile as cloudUpload, getTempFileURL, deleteFile as cloudDelete } from './cloudbase';

// 环境变量
const ENV_ID = process.env.NEXT_PUBLIC_TCB_ENV_ID || process.env.NEXT_PUBLIC_WECHAT_ENV_ID || '';

/**
 * 调用云函数
 */
export async function callCloudFunction(name: string, data: Record<string, any> = {}) {
  return cloudCallFn(name, data);
}

/**
 * 上传文件到云存储
 */
export async function uploadFile(file: File): Promise<string> {
  return cloudUpload(file);
}

/**
 * 获取云存储临时链接
 */
export async function getTempFileURLs(fileIds: string[]) {
  return getTempFileURL(fileIds);
}

/**
 * 删除云存储文件
 */
export async function deleteFile(fileId: string) {
  return cloudDelete(fileId);
}

// ==================== 规格相关类型 ====================

/** 商品规格项（如颜色、尺寸） */
export interface GoodsSpec {
  name: string;        // 规格名称，如"颜色"、"尺寸"
  values: string[];    // 规格值，如["红色","蓝色"]、["S","M","L"]
}

/** SKU（库存单元）*/
export interface SKU {
  id: string;
  specValues: string[];  // 具体的规格组合，如 ["红色", "L"]
  price: number;         // 该规格组合的价格
  stock: number;         // 库存数量
  image?: string;        // 规格专用图片
}

/** 商品数据（含多规格） */
export interface Goods {
  _id: string;
  name: string;
  description: string;
  images: string[];
  sellerId: string;
  createTime: Date;
  updateTime: Date;
  // 多规格相关
  specs: GoodsSpec[];    // 规格定义
  skus: SKU[];           // SKU列表
  minPrice: number;      // 最低价（用于列表展示）
  maxPrice: number;      // 最高价
  hasSpecs: boolean;     // 是否有规格
}

// ==================== 业务 API ====================

/**
 * 商品 CRUD 操作
 */
export const goodsApi = {
  // 获取商品列表
  list: async (params?: { sellerId?: string; keyword?: string; limit?: number; skip?: number }) => {
    return callCloudFunction('goodsCrud', {
      action: 'list',
      ...params,
    });
  },

  // 获取单个商品
  get: async (id: string) => {
    return callCloudFunction('goodsCrud', {
      action: 'get',
      id,
    });
  },

  // 创建商品
  create: async (data: {
    name: string;
    price?: number;
    description: string;
    images: string[];
    sellerId: string;
    specs?: GoodsSpec[];
    skus?: SKU[];
  }) => {
    // 计算最低价和最高价
    let minPrice = data.price || 0;
    let maxPrice = data.price || 0;
    const hasSpecs = !!(data.specs && data.specs.length > 0);
    
    if (data.skus && data.skus.length > 0) {
      const prices = data.skus.map(sku => sku.price);
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    const goodsData = {
      name: data.name,
      price: data.price,
      description: data.description,
      images: data.images,
      sellerId: data.sellerId,
      specs: data.specs || [],
      skus: data.skus || [],
      minPrice,
      maxPrice,
      hasSpecs,
    };

    return callCloudFunction('goodsCrud', {
      action: 'create',
      data: goodsData,
    });
  },

  // 更新商品
  update: async (id: string, data: Partial<{
    name: string;
    price: number;
    description: string;
    images: string[];
    specs: GoodsSpec[];
    skus: SKU[];
  }>) => {
    // 如果更新了规格，重新计算价格
    const specs = data.specs;
    const skus = data.skus;
    
    if (skus && skus.length > 0) {
      const prices = skus.map(sku => sku.price);
      (data as any).minPrice = Math.min(...prices);
      (data as any).maxPrice = Math.max(...prices);
      (data as any).hasSpecs = !!(specs && specs.length > 0);
    }

    return callCloudFunction('goodsCrud', {
      action: 'update',
      id,
      data,
    });
  },

  // 删除商品
  delete: async (id: string) => {
    return callCloudFunction('goodsCrud', {
      action: 'delete',
      id,
    });
  },
};

/**
 * 商家 API
 */
export const sellerApi = {
  list: async (params?: { limit?: number; skip?: number }) => {
    return callCloudFunction('sellerCrud', {
      action: 'list',
      ...params,
    });
  },

  get: async (id: string) => {
    return callCloudFunction('sellerCrud', {
      action: 'get',
      id,
    });
  },

  update: async (id: string, data: Partial<{
    name: string;
    avatar: string;
    phone: string;
  }>) => {
    return callCloudFunction('sellerCrud', {
      action: 'update',
      id,
      data,
    });
  },
};

// ==================== SKU API ====================

export interface SKU {
  _id: string;
  spu?: {
    _id: string;
    name: string;
  };
  description?: string;
  price: number;
  count: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const skuApi = {
  // 获取SKU列表
  list: async (params?: { 
    page?: number; 
    pageSize?: number; 
    search?: string; 
    spuId?: string 
  }) => {
    return callCloudFunction('skuCrud', {
      action: 'list',
      ...params,
    });
  },

  // 获取单个SKU
  get: async (id: string) => {
    return callCloudFunction('skuCrud', {
      action: 'get',
      id,
    });
  },

  // 创建SKU
  create: async (data: {
    spu?: { _id: string; name: string };
    description?: string;
    price: number;
    count: number;
    image?: string;
  }) => {
    return callCloudFunction('skuCrud', {
      action: 'create',
      data,
    });
  },

  // 更新SKU
  update: async (id: string, data: Partial<{
    description: string;
    price: number;
    count: number;
    image: string;
  }>) => {
    return callCloudFunction('skuCrud', {
      action: 'update',
      id,
      data,
    });
  },

  // 删除SKU
  delete: async (id: string) => {
    return callCloudFunction('skuCrud', {
      action: 'delete',
      id,
    });
  },

  // 批量删除SKU
  batchDelete: async (ids: string[]) => {
    return callCloudFunction('skuCrud', {
      action: 'batchDelete',
      ids,
    });
  },

  // 更新库存
  updateStock: async (id: string, count: number, type: 'add' | 'reduce' = 'reduce') => {
    return callCloudFunction('skuCrud', {
      action: 'updateStock',
      id,
      count,
      type,
    });
  },
};

// ==================== 登录 API ====================

/** 登录方式 */
export type LoginType = 'wechat' | 'phone';

/** 登录用户信息 */
export interface LoginUser {
  _id: string;
  openid?: string;       // 微信openid
  phone?: string;        // 手机号
  nickname?: string;     // 昵称
  avatar?: string;        // 头像
  userType: 'admin' | 'seller';  // 用户类型
  createTime: Date;
}

/**
 * 微信登录 - 获取登录凭证
 */
export async function getWechatLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    // @ts-ignore - 微信JSSDK类型
    if (typeof wx !== 'undefined' && wx.weixinAppLogin) {
      // @ts-ignore
      wx.weixinAppLogin({
        success: (res: { code: string }) => {
          if (res.code) {
            resolve(res.code);
          } else {
            reject(new Error('获取微信登录凭证失败'));
          }
        },
        fail: (err: any) => {
          reject(err);
        }
      });
    } else {
      // 非微信环境，模拟登录（开发环境使用）
      resolve('mock_wechat_code_' + Date.now());
    }
  });
}

/**
 * 手机号一键登录
 */
export async function getPhoneLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    if (typeof wx !== 'undefined' && wx.getPhoneMask) {
      // 先获取手机号掩码
      // @ts-ignore
      wx.getPhoneMask({
        success: () => {
          // 然后一键登录
          // @ts-ignore
          wx.phoneOneClickLogin({
            success: (res: { code: string }) => {
              if (res.code) {
                resolve(res.code);
              } else {
                reject(new Error('获取手机号登录凭证失败'));
              }
            },
            fail: reject
          });
        },
        fail: reject
      });
    } else {
      // 非微信环境，模拟登录（开发环境使用）
      resolve('mock_phone_code_' + Date.now());
    }
  });
}

/**
 * 登录 API
 */
export const authApi = {
  // 微信扫码登录 - 发起登录（显示二维码）
  wechatLogin: async () => {
    // 返回微信扫码登录的授权URL
    const appId = process.env.NEXT_PUBLIC_WECHAT_APP_ID || '';
    const redirectUri = typeof window !== 'undefined' 
      ? encodeURIComponent(window.location.origin + '/login/callback')
      : '';
    
    if (!appId) {
      // 开发环境返回模拟
      return { success: true, qrUrl: '' };
    }
    
    const qrUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=wechat_login#wechat_redirect`;
    return { success: true, qrUrl };
  },

  // 处理微信回调
  handleWechatCallback: async (code: string, state: string) => {
    return callCloudFunction('auth', {
      action: 'wechat_callback',
      code,
      state,
    });
  },

  // 检查微信扫码登录状态（轮询）
  checkWechatCallback: async () => {
    return callCloudFunction('auth', {
      action: 'check_wechat_status',
    });
  },

  // 手机号登录
  phoneLogin: async (phone: string, code: string) => {
    return callCloudFunction('auth', {
      action: 'phone_login',
      phone,
      code,
    });
  },

  // 验证码登录（备用方案）
  sendCode: async (phone: string) => {
    return callCloudFunction('auth', {
      action: 'send_code',
      phone,
    });
  },

  // 验证验证码
  verifyCode: async (phone: string, code: string) => {
    return callCloudFunction('auth', {
      action: 'verify_code',
      phone,
      code,
    });
  },

  // 获取当前登录用户
  getCurrentUser: async () => {
    return callCloudFunction('auth', {
      action: 'get_current_user',
    });
  },

  // 退出登录
  logout: async () => {
    return callCloudFunction('auth', {
      action: 'logout',
    });
  },
};

// ==================== 评论 API ====================

export interface Comment {
  _id: string;
  spuId: string;        // 商品ID
  goodsName?: string;   // 商品名称（后台展示用）
  orderItemId?: string; // 订单项ID
  userId: string;       // 用户ID
  userName: string;     // 用户昵称
  avatarUrl?: string;   // 用户头像
  rating: number;       // 评分 1-5
  content: string;      // 评论内容
  images?: string[];    // 评论图片
  reply?: string;       // 商家回复
  replyTime?: Date;     // 回复时间
  status: 'pending' | 'approved' | 'rejected';  // 状态
  createTime: Date;
  updateTime?: Date;
}

export const commentApi = {
  // 获取商品评论列表（小程序端）
  list: async (params?: { spuId?: string; page?: number; pageSize?: number }) => {
    return callCloudFunction('commentCrud', {
      action: 'list',
      ...params,
    });
  },

  // 获取所有评论列表（管理后台）
  getAllList: async (params?: { status?: string; keyword?: string; page?: number; pageSize?: number }) => {
    return callCloudFunction('commentCrud', {
      action: 'getAllList',
      ...params,
    });
  },

  // 获取商品评论统计
  getStatistics: async (spuId: string) => {
    return callCloudFunction('commentCrud', {
      action: 'getStatistics',
      spuId,
    });
  },

  // 获取商品详情页评论信息
  getDetailCommentInfo: async (spuId: string) => {
    return callCloudFunction('commentCrud', {
      action: 'getDetailCommentInfo',
      spuId,
    });
  },

  get: async (id: string) => {
    return callCloudFunction('commentCrud', {
      action: 'get',
      id,
    });
  },

  create: async (data: {
    spuId: string;
    orderItemId?: string;
    userName?: string;
    avatarUrl?: string;
    rating: number;
    content: string;
    images?: string[];
  }) => {
    return callCloudFunction('commentCrud', {
      action: 'create',
      data,
    });
  },

  reply: async (id: string, reply: string) => {
    return callCloudFunction('commentCrud', {
      action: 'reply',
      id,
      reply,
    });
  },

  updateStatus: async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    return callCloudFunction('commentCrud', {
      action: 'updateStatus',
      id,
      status,
    });
  },

  delete: async (id: string) => {
    return callCloudFunction('commentCrud', {
      action: 'adminDelete',
      id,
    });
  },
};

// ==================== 轮播图 API ====================

export interface Banner {
  _id: string;
  title: string;
  image: string;
  link?: string;         // 跳转链接
  linkType?: 'activity' | 'goods' | 'category' | 'url';
  position: number;      // 排序位置
  status: 'enabled' | 'disabled';
  startTime?: Date;      // 开始显示时间
  endTime?: Date;       // 结束显示时间
  createTime: Date;
  updateTime: Date;
}

// ==================== 主题活动 API ====================

export interface ActivityGoods {
  goodsId: string;
  name: string;
  image: string;
  intro: string;
}

export interface Activity {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  goodsList: ActivityGoods[];
  goodsIds?: string[]; // 兼容旧数据
  isActive: boolean;
  sort: number;
  createTime: Date;
  updateTime: Date;
}

export const activityApi = {
  // 获取活动列表
  getList: async (params?: { isActive?: boolean; limit?: number }) => {
    return callCloudFunction('activityCrud', {
      action: 'getList',
      ...params,
    });
  },

  // 获取单个活动
  get: async (id: string) => {
    return callCloudFunction('activityCrud', {
      action: 'get',
      id,
    });
  },

  // 创建活动
  create: async (data: {
    title: string;
    description?: string;
    coverImage?: string;
    goodsList?: ActivityGoods[];
    isActive?: boolean;
    sort?: number;
  }) => {
    return callCloudFunction('activityCrud', {
      action: 'create',
      data,
    });
  },

  // 更新活动
  update: async (id: string, data: Partial<Activity>) => {
    return callCloudFunction('activityCrud', {
      action: 'update',
      id,
      data,
    });
  },

  // 删除活动
  delete: async (id: string) => {
    return callCloudFunction('activityCrud', {
      action: 'delete',
      id,
    });
  },
};

// 统一处理云函数返回结果
function handleCloudResult(result: any) {
  if (result?.code === 0) {
    return result.data;
  }
  throw new Error(result?.message || '操作失败');
}

export const bannerApi = {
  list: async (params?: { status?: string; limit?: number; skip?: number }) => {
    const result = await callCloudFunction('bannerCrud', {
      action: 'list',
      ...params,
    });
    return handleCloudResult(result);
  },

  get: async (id: string) => {
    const result = await callCloudFunction('bannerCrud', {
      action: 'get',
      id,
    });
    return handleCloudResult(result);
  },

  create: async (data: {
    title: string;
    image: string;
    link?: string;
    linkType?: 'activity' | 'goods' | 'category' | 'url';
    position?: number;
    status?: 'enabled' | 'disabled';
  }) => {
    const result = await callCloudFunction('bannerCrud', {
      action: 'create',
      ...data,
    });
    return handleCloudResult(result);
  },

  update: async (id: string, data: Partial<{
    title: string;
    image: string;
    link: string;
    linkType: 'activity' | 'goods' | 'category' | 'url';
    position: number;
    status: 'enabled' | 'disabled';
  }>) => {
    const result = await callCloudFunction('bannerCrud', {
      action: 'update',
      id,
      ...data,
    });
    return handleCloudResult(result);
  },

  delete: async (id: string) => {
    const result = await callCloudFunction('bannerCrud', {
      action: 'delete',
      id,
    });
    return handleCloudResult(result);
  },

  reorder: async (ids: string[]) => {
    const result = await callCloudFunction('bannerCrud', {
      action: 'reorder',
      ids,
    });
    return handleCloudResult(result);
  },
};

// ==================== 订单 API ====================

export interface OrderItem {
  goodsId: string;
  goodsName: string;
  image: string;
  price: number;
  quantity: number;
  specValues?: string[];  // 规格
}

export interface Order {
  _id: string;
  orderNo: string;        // 订单号
  userId: string;
  userName: string;
  userPhone: string;
  address: string;        // 收货地址
  items: OrderItem[];    // 订单商品
  totalAmount: number;   // 订单总金额
  freight: number;       // 运费
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded';
  payTime?: Date;       // 支付时间
  shipTime?: Date;      // 发货时间
  completeTime?: Date;  // 完成时间
  expressNo?: string;    // 快递单号
  expressCompany?: string; // 快递公司
  remark?: string;      // 备注
  createTime: Date;
  updateTime: Date;
}

export const orderApi = {
  list: async (params?: { 
    status?: string; 
    userId?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    limit?: number; 
    skip?: number 
  }) => {
    return callCloudFunction('orderCrud', {
      action: 'list',
      ...params,
    });
  },

  get: async (id: string) => {
    return callCloudFunction('orderCrud', {
      action: 'get',
      id,
    });
  },

  updateStatus: async (id: string, status: Order['status'], data?: any) => {
    return callCloudFunction('orderCrud', {
      action: 'update_status',
      id,
      status,
      ...data,
    });
  },

  ship: async (id: string, expressCompany: string, expressNo: string) => {
    return callCloudFunction('orderCrud', {
      action: 'ship',
      id,
      expressCompany,
      expressNo,
      shipTime: new Date(),
    });
  },

  cancel: async (id: string, reason?: string) => {
    return callCloudFunction('orderCrud', {
      action: 'cancel',
      id,
      reason,
    });
  },

  refund: async (id: string, reason?: string) => {
    return callCloudFunction('orderCrud', {
      action: 'refund',
      id,
      reason,
    });
  },

  delete: async (id: string) => {
    return callCloudFunction('orderCrud', {
      action: 'delete',
      id,
    });
  },

  // 订单统计
  stats: async () => {
    return callCloudFunction('orderCrud', {
      action: 'stats',
    });
  },
};

// ==================== 分类 API ====================

export interface Category {
  _id: string;
  name: string;          // 分类名称
  parentId?: string;     // 父分类ID（空为顶级分类）
  icon?: string;        // 图标
  image?: string;        // 分类图片
  description?: string;  // 分类描述
  level: number;         // 层级（1, 2, 3）
  position: number;      // 排序
  goodsCount: number;    // 商品数量
  status: 'enabled' | 'disabled';
  createTime: Date;
  updateTime: Date;
  children?: Category[]; // 子分类
}

export const categoryApi = {
  // 获取分类列表（树形）
  listTree: async () => {
    const result = await callCloudFunction('categoryCrud', {
      action: 'list_tree',
    });
    return handleCloudResult(result);
  },

  // 获取分类列表（扁平）
  list: async (params?: { parentId?: string; level?: number; status?: string; limit?: number; skip?: number }) => {
    const result = await callCloudFunction('categoryCrud', {
      action: 'list',
      ...params,
    });
    return handleCloudResult(result);
  },

  get: async (id: string) => {
    const result = await callCloudFunction('categoryCrud', {
      action: 'get',
      id,
    });
    return handleCloudResult(result);
  },

  create: async (data: {
    name: string;
    parentId?: string;
    icon?: string;
    image?: string;
    description?: string;
    position?: number;
    status?: 'enabled' | 'disabled';
  }) => {
    const result = await callCloudFunction('categoryCrud', {
      action: 'create',
      data,
    });
    return handleCloudResult(result);
  },

  update: async (id: string, data: Partial<{
    name: string;
    icon: string;
    image: string;
    description: string;
    position: number;
    status: 'enabled' | 'disabled';
    parentId: string;
  }>) => {
    const result = await callCloudFunction('categoryCrud', {
      action: 'update',
      id,
      data,
    });
    return handleCloudResult(result);
  },

  delete: async (id: string) => {
    const result = await callCloudFunction('categoryCrud', {
      action: 'delete',
      id,
    });
    return handleCloudResult(result);
  },

  // 移动分类
  move: async (id: string, newParentId?: string) => {
    const result = await callCloudFunction('categoryCrud', {
      action: 'move',
      id,
      newParentId,
    });
    return handleCloudResult(result);
  },
};

// ==================== 用户 API ====================

export interface SystemUser {
  _id: string;
  username: string;
  nickname: string;
  role: 'admin' | 'seller';
  status: 'enabled' | 'disabled';
  createTime: Date;
  updateTime: Date;
}

export const userApi = {
  // 登录
  login: async (username: string, password: string) => {
    return fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(res => res.json());
  },

  // 获取用户列表
  list: async (params?: { keyword?: string; role?: string; status?: string; limit?: number; skip?: number }) => {
    return callCloudFunction('userCrud', {
      action: 'list',
      ...params,
    });
  },

  // 获取单个用户
  get: async (id: string) => {
    return callCloudFunction('userCrud', {
      action: 'get',
      id,
    });
  },

  // 创建用户
  create: async (data: {
    username: string;
    password: string;
    nickname: string;
    role: 'admin' | 'seller';
    status?: 'enabled' | 'disabled';
  }) => {
    return callCloudFunction('userCrud', {
      action: 'create',
      data,
    });
  },

  // 更新用户
  update: async (id: string, data: Partial<{
    nickname: string;
    role: 'admin' | 'seller';
    status: 'enabled' | 'disabled';
  }>) => {
    return callCloudFunction('userCrud', {
      action: 'update',
      id,
      data,
    });
  },

  // 修改密码
  updatePassword: async (id: string, oldPassword: string, newPassword: string) => {
    return callCloudFunction('userCrud', {
      action: 'update_password',
      id,
      oldPassword,
      newPassword,
    });
  },

  // 删除用户
  delete: async (id: string) => {
    return callCloudFunction('userCrud', {
      action: 'delete',
      id,
    });
  },
};

// ==================== 客户（小程序用户）API ====================

/** 小程序客户 */
export interface Customer {
  _id: string;
  openid: string;
  nickName: string;
  avatarUrl: string;
  gender: number;      // 0-未知 1-男 2-女
  phoneNumber: string;
  status: 'active' | 'inactive' | 'banned';
  loginCount: number;
  lastLoginTime: Date;
  createTime: Date;
  updateTime: Date;
}

/**
 * 客户管理 API
 */
export const customerApi = {
  // 获取客户列表
  list: async (params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) => {
    return callCloudFunction('userCrud', {
      action: 'list',
      ...params,
    });
  },

  // 获取单个客户
  get: async (id: string) => {
    return callCloudFunction('userCrud', {
      action: 'get',
      id,
    });
  },

  // 更新客户状态
  updateStatus: async (id: string, status: 'active' | 'inactive' | 'banned') => {
    return callCloudFunction('userCrud', {
      action: 'updateStatus',
      id,
      status,
    });
  },

  // 获取客户统计
  getStats: async () => {
    return callCloudFunction('userCrud', {
      action: 'getStats',
    });
  },
};
