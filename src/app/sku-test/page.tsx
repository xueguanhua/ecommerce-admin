'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { skuApi } from '@/lib/wechat-cloud';
import { Loader2, Plus, Trash2, Search, Package, Minus, PlusCircle } from 'lucide-react';

export default function SkuTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [skuId, setSkuId] = useState('');
  const [spuId, setSpuId] = useState('');

  // 显示结果
  const showResult = (res: any) => {
    setResult(res);
    console.log('API Result:', res);
  };

  // 1. 获取列表
  const testList = async () => {
    setLoading(true);
    try {
      const res = await skuApi.list({ page: 1, pageSize: 10 });
      showResult(res);
    } catch (error) {
      showResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 2. 创建 SKU
  const testCreate = async () => {
    setLoading(true);
    try {
      const res = await skuApi.create({
        spu: {
          _id: spuId || 'test-spu-001',
          name: '测试商品'
        },
        description: '红色-大号-' + Date.now(),
        price: 99.99,
        count: 100,
        image: 'https://example.com/image.jpg'
      });
      showResult(res);
      if (res?.data?._id) {
        setSkuId(res.data._id);
      }
    } catch (error) {
      showResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 3. 获取单个
  const testGet = async () => {
    if (!skuId) {
      alert('请先创建 SKU 或输入 SKU ID');
      return;
    }
    setLoading(true);
    try {
      const res = await skuApi.get(skuId);
      showResult(res);
    } catch (error) {
      showResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 4. 更新
  const testUpdate = async () => {
    if (!skuId) {
      alert('请先创建 SKU 或输入 SKU ID');
      return;
    }
    setLoading(true);
    try {
      const res = await skuApi.update(skuId, {
        price: 88.88,
        count: 50
      });
      showResult(res);
    } catch (error) {
      showResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 5. 减少库存
  const testReduceStock = async () => {
    if (!skuId) {
      alert('请先创建 SKU 或输入 SKU ID');
      return;
    }
    setLoading(true);
    try {
      const res = await skuApi.updateStock(skuId, 5, 'reduce');
      showResult(res);
    } catch (error) {
      showResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 6. 增加库存
  const testAddStock = async () => {
    if (!skuId) {
      alert('请先创建 SKU 或输入 SKU ID');
      return;
    }
    setLoading(true);
    try {
      const res = await skuApi.updateStock(skuId, 10, 'add');
      showResult(res);
    } catch (error) {
      showResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 7. 删除
  const testDelete = async () => {
    if (!skuId) {
      alert('请先创建 SKU 或输入 SKU ID');
      return;
    }
    if (!confirm('确定要删除这个 SKU 吗？')) return;
    setLoading(true);
    try {
      const res = await skuApi.delete(skuId);
      showResult(res);
      setSkuId('');
    } catch (error) {
      showResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold">SKU CRUD 测试</h1>
        <p className="text-muted-foreground mt-1">测试云函数 skuCrud 的各项接口</p>
      </div>

      {/* 输入区域 */}
      <Card>
        <CardHeader>
          <CardTitle>参数设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">SPU ID (用于创建)</label>
              <Input
                placeholder="输入 SPU ID，如: spu-001"
                value={spuId}
                onChange={(e) => setSpuId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SKU ID (用于操作)</label>
              <Input
                placeholder="创建后自动填充"
                value={skuId}
                onChange={(e) => setSkuId(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 测试按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>接口测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={testList} disabled={loading} variant="outline">
              <Search className="mr-2 h-4 w-4" />
              获取列表
            </Button>
            <Button onClick={testCreate} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              创建 SKU
            </Button>
            <Button onClick={testGet} disabled={loading} variant="outline">
              <Package className="mr-2 h-4 w-4" />
              获取单个
            </Button>
            <Button onClick={testUpdate} disabled={loading} variant="outline">
              更新 SKU
            </Button>
            <Button onClick={testReduceStock} disabled={loading} variant="outline">
              <Minus className="mr-2 h-4 w-4" />
              减少库存
            </Button>
            <Button onClick={testAddStock} disabled={loading} variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              增加库存
            </Button>
            <Button onClick={testDelete} disabled={loading} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              删除 SKU
            </Button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              请求中...
            </div>
          )}
        </CardContent>
      </Card>

      {/* 结果显示 */}
      <Card>
        <CardHeader>
          <CardTitle>返回结果</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
            {result ? JSON.stringify(result, null, 2) : '点击上方按钮进行测试...'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
