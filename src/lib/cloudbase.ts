/**
 * 腾讯云 CloudBase SDK 客户端
 * 文档：https://docs.cloudbase.net/api-reference/webv2/initialization
 */

import cloudbase from '@cloudbase/js-sdk';

// 环境变量
const ENV_ID = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '';
const REGION = process.env.NEXT_PUBLIC_CLOUDBASE_REGION || 'ap-shanghai';

// 延迟初始化，只在客户端执行
let appInstance: any = null;

function getApp() {
  if (typeof window === 'undefined') {
    console.warn('CloudBase SDK 只能在客户端使用');
    return null;
  }

  if (!appInstance) {
    if (!ENV_ID) {
      console.warn('CloudBase 环境ID未配置');
      return null;
    }
    
    appInstance = cloudbase.init({
      env: ENV_ID,
      region: REGION as any,
    });
  }
  
  return appInstance;
}

/**
 * 匿名登录
 */
export async function anonymousSignIn() {
  const app = getApp();
  if (!app) {
    throw new Error('CloudBase 未初始化');
  }

  const auth = app.auth();
  await auth.anonymousAuthProvider().signIn();
  console.log('匿名登录成功');
  return true;
}

/**
 * 检查登录状态
 */
export async function checkLoginState() {
  const app = getApp();
  if (!app) return false;
  
  const auth = app.auth();
  const loginState = await auth.getLoginState();
  return !!loginState;
}

/**
 * 调用云函数
 */
export async function callCloudFunction(name: string, data: Record<string, any> = {}) {
  const app = getApp();
  if (!app) {
    throw new Error('CloudBase 未初始化，请确保在客户端环境运行');
  }

  // 确保已登录
  const isLoggedIn = await checkLoginState();
  if (!isLoggedIn) {
    await anonymousSignIn();
  }

  console.log(`调用云函数 ${name}:`, data);
  
  const result = await app.callFunction({
    name,
    data,
  });
  
  console.log(`云函数 ${name} 返回:`, result);
  
  if (result.errMsg) {
    throw new Error(`云函数调用失败: ${result.errMsg}`);
  }
  
  return result.result;
}

/**
 * 上传文件到云存储（通过云函数）
 */
export async function uploadFile(file: File): Promise<string> {
  // 将文件转为 base64
  const base64 = await fileToBase64(file);
  
  // 调用云函数上传
  const result = await callCloudFunction('uploadFile', {
    fileContent: base64,
    cloudPath: 'uploads/' + Date.now() + '-' + file.name,
  });
  
  if (result.code !== 0) {
    throw new Error(result.message || '上传失败');
  }
  
  return result.data.fileID;
}

/**
 * 文件转 base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // 去掉 data:image/jpeg;base64, 前缀
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * 获取云存储临时链接（通过云函数）
 * 由于云存储权限限制，前端无法直接获取，需要通过云函数中转
 */
export async function getTempFileURL(fileIds: string[]) {
  // 调用云函数获取临时URL
  const result = await callCloudFunction('getTempFileURL', {
    fileList: fileIds,
  });
  
  if (result.code !== 0) {
    throw new Error(result.message || '获取临时URL失败');
  }
  
  return result.data;
}

/**
 * 删除云存储文件
 */
export async function deleteFile(fileId: string) {
  const app = getApp();
  if (!app) {
    throw new Error('CloudBase 未初始化');
  }

  // 确保已登录
  const isLoggedIn = await checkLoginState();
  if (!isLoggedIn) {
    await anonymousSignIn();
  }

  return app.deleteFile({
    fileList: [fileId],
  });
}

// 导出 app 实例
export const app = {
  get instance() {
    return getApp();
  }
};
