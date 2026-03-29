'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { goodsApi, getTempFileURLs } from '@/lib/wechat-cloud';
import { formatDate, formatPrice } from '@/lib/utils';

interface Goods {
  _id: string;
  name: string;
  price?: number;
  description: string;
  images: string[];
  sellerId: string;
  createTime: Date;
  updateTime: Date;
  // 多规格相关
  specs?: { name: string; values: string[] }[];
  skus?: { specValues: string[]; price: number; stock: number }[];
  minPrice?: number;
  maxPrice?: number;
  hasSpecs?: boolean;
}

export default function GoodsPage() {
  const [goods, setGoods] = useState<Goods[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadGoods();
  }, []);

  const loadGoods = async () => {
    try {
      setLoading(true);
      const result = await goodsApi.list({ limit: 100 });
      // 云函数返回的是 { code: 0, data: { list: [...], total: ... } }
      let list = result?.data?.list || result?.data || [];
      list = Array.isArray(list) ? list : [];
      
      // 收集所有需要转换的 cloud:// 图片 fileID
      const allImageFileIds: string[] = [];
      list.forEach((item: Goods) => {
        if (item.images && item.images.length > 0) {
          item.images.forEach((img: string) => {
            if (img?.startsWith('cloud://')) {
              allImageFileIds.push(img);
            }
          });
        }
      });
      
      // 批量获取临时 URL
      if (allImageFileIds.length > 0) {
        try {
          const tempUrls = await getTempFileURLs(allImageFileIds);
          const urlMap = new Map<string, string>();
          tempUrls.forEach((item: any) => {
            if (item.tempFileURL) {
              urlMap.set(item.fileID, item.tempFileURL);
            }
          });
          
          // 更新商品列表中的图片 URL
          list = list.map((item: Goods) => ({
            ...item,
            images: (item.images || []).map((img: string) => 
              urlMap.get(img) || img
            ),
          }));
        } catch (e) {
          console.error('获取图片临时链接失败:', e);
        }
      }
      
      setGoods(list);
    } catch (error) {
      console.error('加载商品失败:', error);
      setGoods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    
    try {
      setDeleting(id);
      await goodsApi.delete(id);
      setGoods(goods.filter(g => g._id !== id));
    } catch (error) {
      console.error('删除商品失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDeleting(null);
    }
  };

  const filteredGoods = goods.filter(g => 
    g.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    g.description.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">商品管理</h1>
          <p className="text-muted-foreground mt-1">管理你的商品列表</p>
        </div>
        <Link href="/goods/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加商品
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>商品列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索商品..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : filteredGoods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchKeyword ? '没有找到匹配的商品' : '暂无商品'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">图片</TableHead>
                  <TableHead>商品名称</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGoods.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                        {item.images && item.images.length > 0 && !item.images[0].startsWith('cloud://') ? (
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.name}
                      {item.hasSpecs && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-secondary rounded">
                          多规格
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.hasSpecs && item.minPrice !== undefined && item.maxPrice !== undefined ? (
                        <span>
                          {formatPrice(item.minPrice)}
                          {item.minPrice !== item.maxPrice && ` ~ ${formatPrice(item.maxPrice)}`}
                        </span>
                      ) : (
                        formatPrice(item.price || 0)
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.description || '-'}
                    </TableCell>
                    <TableCell>{formatDate(item.createTime)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/goods/${item._id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item._id)}
                          disabled={deleting === item._id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            共 {filteredGoods.length} 件商品
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
