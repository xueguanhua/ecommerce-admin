'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { goodsApi, skuApi, uploadFile, getTempFileURLs, categoryApi, type GoodsSpec, type SKU, type Category } from '@/lib/wechat-cloud';
import { Image as ImageIcon, Upload, X, ArrowLeft, Loader2, Plus, Trash2, Minus, Edit, Package, PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';

// 生成SKU唯一ID
const generateSkuId = () => 'sku_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

// 生成规格组合
const generateSkuCombinations = (specs: GoodsSpec[]): string[][] => {
  if (specs.length === 0) return [];
  if (specs.length === 1) return specs[0].values.map(v => [v]);

  const combinations: string[][] = [];
  const firstSpec = specs[0];
  const restCombinations = generateSkuCombinations(specs.slice(1));

  for (const value of firstSpec.values) {
    if (restCombinations.length === 0) {
      combinations.push([value]);
    } else {
      for (const rest of restCombinations) {
        combinations.push([value, ...rest]);
      }
    }
  }

  return combinations;
};

export default function GoodsEditPage() {
  const router = useRouter();
  const params = useParams();
  const isEdit = params.id !== 'new';
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDesc, setUploadingDesc] = useState(false);
  const [useSpecs, setUseSpecs] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    images: [] as string[], // 存储 cloud:// fileID
    descImages: [] as string[], // 详情图片
    sellerId: '',
    categoryId: '',
    specs: [] as GoodsSpec[],
    skus: [] as SKU[],
    isHot: false,
    isNew: false,
    isDiscount: false,
    tags: [] as string[], // 商品标签
  });
  // 图片临时 URL（用于页面显示）
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  // 详情图片临时 URL
  const [descImagePreviewUrls, setDescImagePreviewUrls] = useState<string[]>([]);
  // 云端 SKU 列表
  const [cloudSkus, setCloudSkus] = useState<any[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(false);

  useEffect(() => {
    loadCategories();
    if (isEdit) {
      loadGoods();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const result = await categoryApi.list({});
      const list = result?.list || [];
      setCategories(list);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadGoods = async () => {
    try {
      setLoading(true);
      const result = await goodsApi.get(id);
      if (result?.data) {
        const data = result.data;
        
        // 转换图片 fileID 为临时 URL 用于显示
        const imageFileIds = data.images || [];
        let previewUrls: string[] = [];
        console.log('加载商品图片:', imageFileIds);
        
        if (imageFileIds.length > 0) {
          // 检查是否包含 cloud:// 开头的 fileID
          const hasCloudFiles = imageFileIds.some((id: string) => id?.startsWith('cloud://'));
          
          if (hasCloudFiles) {
            try {
              const tempUrls = await getTempFileURLs(imageFileIds);
              console.log('获取临时URL结果:', tempUrls);
              previewUrls = tempUrls.map((item: any) => {
                const url = item.tempFileURL || item.fileID;
                console.log('图片URL:', url, '原始fileID:', item.fileID);
                return url;
              });
            } catch (e) {
              console.error('获取图片临时链接失败:', e);
              // 失败时不显示任何图片，避免显示无法加载的 cloud:// URL
              previewUrls = [];
            }
          } else {
            // 如果没有 cloud:// 开头的，直接使用（可能是外部URL）
            previewUrls = imageFileIds;
          }
        }
        
        setFormData({
          name: data.name || '',
          price: data.price?.toString() || '',
          description: data.description || '',
          images: imageFileIds, // 保存 fileID
          descImages: data.descImages || [],
          sellerId: data.sellerId || '',
          categoryId: data.categoryId || '',
          specs: data.specs || [],
          skus: data.skus || [],
          isHot: data.isHot || false,
          isNew: data.isNew || false,
          isDiscount: data.isDiscount || false,
          tags: data.tags || [],
        });
        setImagePreviewUrls(previewUrls); // 设置预览 URL

        // 加载详情图片
        const descImageFileIds = data.descImages || [];
        if (descImageFileIds.length > 0) {
          const hasDescCloudFiles = descImageFileIds.some((id: string) => id?.startsWith('cloud://'));
          if (hasDescCloudFiles) {
            try {
              const descTempUrls = await getTempFileURLs(descImageFileIds);
              const descPreviewUrls = descTempUrls.map((item: any) => item.tempFileURL || item.fileID);
              setDescImagePreviewUrls(descPreviewUrls);
            } catch (e) {
              console.error('获取详情图片临时链接失败:', e);
              setDescImagePreviewUrls([]);
            }
          } else {
            setDescImagePreviewUrls(descImageFileIds);
          }
        }

        setUseSpecs(data.hasSpecs || false);
        // 加载云端 SKU
        await loadCloudSkus(id);
      }
    } catch (error) {
      console.error('加载商品失败:', error);
      alert('加载商品失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载云端 SKU 列表
  const loadCloudSkus = async (spuId: string) => {
    try {
      setLoadingSkus(true);
      const result = await skuApi.list({ spuId, pageSize: 100 });
      if (result?.code === 0) {
        setCloudSkus(result.data?.list || []);
      }
    } catch (error) {
      console.error('加载 SKU 失败:', error);
    } finally {
      setLoadingSkus(false);
    }
  };

  // 同步本地 SKU 到云端
  const syncSkusToCloud = async (spuId: string, spuName: string) => {
    if (!useSpecs || formData.skus.length === 0) return;

    try {
      // 获取现有 SKU 用于对比
      const existingResult = await skuApi.list({ spuId, pageSize: 100 });
      const existingSkus = existingResult?.data?.list || [];
      const existingIds = new Set(existingSkus.map((s: any) => s._id));

      // 创建或更新 SKU
      for (const sku of formData.skus) {
        const skuData = {
          spu: { _id: spuId, name: spuName },
          description: sku.specValues.join(' / '),
          price: sku.price,
          count: sku.stock,
          image: formData.images[0] || '',
          specValues: sku.specValues,
        };

        // 查找是否已存在（根据规格值匹配）
        const existing = existingSkus.find((s: any) => 
          s.description === skuData.description
        );

        if (existing) {
          // 更新
          await skuApi.update(existing._id, skuData);
        } else {
          // 创建
          await skuApi.create(skuData);
        }
      }

      // 刷新列表
      await loadCloudSkus(spuId);
    } catch (error) {
      console.error('同步 SKU 失败:', error);
      throw error;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const newFileIds: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = await uploadFile(file);
        newFileIds.push(fileId);
      }
      
      // 获取临时 URL 用于显示
      let newPreviewUrls: string[] = [];
      if (newFileIds.length > 0) {
        const tempUrls = await getTempFileURLs(newFileIds);
        newPreviewUrls = tempUrls.map((item: any) => item.tempFileURL || item.fileID);
      }
      
      // 更新 fileID 列表和预览 URL 列表
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newFileIds] }));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('上传图片失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 详情图片上传
  const handleDescImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingDesc(true);
      const newFileIds: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = await uploadFile(file);
        newFileIds.push(fileId);
      }

      // 获取临时 URL 用于显示
      let newPreviewUrls: string[] = [];
      if (newFileIds.length > 0) {
        const tempUrls = await getTempFileURLs(newFileIds);
        newPreviewUrls = tempUrls.map((item: any) => item.tempFileURL || item.fileID);
      }

      // 更新 fileID 列表和预览 URL 列表
      setFormData(prev => ({ ...prev, descImages: [...prev.descImages, ...newFileIds] }));
      setDescImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    } catch (error) {
      console.error('上传详情图片失败:', error);
      alert('上传详情图片失败，请重试');
    } finally {
      setUploadingDesc(false);
    }
  };

  const removeDescImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      descImages: prev.descImages.filter((_, i) => i !== index),
    }));
    setDescImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 拖拽排序详情图片
  const moveDescImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formData.descImages.length) return;

    const newDescImages = [...formData.descImages];
    const newPreviews = [...descImagePreviewUrls];

    // 交换位置
    [newDescImages[fromIndex], newDescImages[toIndex]] = [newDescImages[toIndex], newDescImages[fromIndex]];
    [newPreviews[fromIndex], newPreviews[toIndex]] = [newPreviews[toIndex], newPreviews[fromIndex]];

    setFormData(prev => ({ ...prev, descImages: newDescImages }));
    setDescImagePreviewUrls(newPreviews);
  };

  // 规格管理
  const addSpec = () => {
    setFormData(prev => ({
      ...prev,
      specs: [...prev.specs, { name: '', values: [] }],
    }));
  };

  const updateSpecName = (index: number, name: string) => {
    setFormData(prev => {
      const newSpecs = [...prev.specs];
      newSpecs[index] = { ...newSpecs[index], name };
      return { ...prev, specs: newSpecs };
    });
  };

  const updateSpecValues = (index: number, valuesStr: string) => {
    const values = valuesStr.split(',').map(v => v.trim()).filter(v => v);
    setFormData(prev => {
      const newSpecs = [...prev.specs];
      newSpecs[index] = { ...newSpecs[index], values };
      return { ...prev, specs: newSpecs };
    });
  };

  const removeSpec = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specs: prev.specs.filter((_, i) => i !== index),
    }));
    generateSkus();
  };

  // 生成SKU
  const generateSkus = () => {
    if (!useSpecs || formData.specs.length === 0) {
      setFormData(prev => ({ ...prev, skus: [] }));
      return;
    }

    const combinations = generateSkuCombinations(formData.specs);
    const existingSkus = formData.skus;

    const newSkus = combinations.map(combo => {
      // 尝试找已存在的SKU
      const existing = existingSkus.find(sku => 
        sku.specValues?.length === combo.length && 
        combo.every((v, i) => v === sku.specValues?.[i])
      );
      
      return existing || {
        id: generateSkuId(),
        specValues: combo,
        price: formData.price ? parseFloat(formData.price) : 0,
        stock: 0,
      } as SKU;
    });

    setFormData(prev => ({ ...prev, skus: newSkus }));
  };

  const updateSku = (skuId: string, field: 'price' | 'stock', value: string) => {
    setFormData(prev => ({
      ...prev,
      skus: prev.skus.map(sku => 
        sku.id === skuId 
          ? { ...sku, [field]: field === 'price' ? parseFloat(value) || 0 : parseInt(value) || 0 }
          : sku
      ),
    }));
  };

  const handleUseSpecsChange = (checked: boolean) => {
    setUseSpecs(checked);
    if (checked) {
      generateSkus();
    } else {
      setFormData(prev => ({ ...prev, specs: [], skus: [] }));
    }
  };

  useEffect(() => {
    if (useSpecs && formData.specs.length > 0) {
      generateSkus();
    }
  }, [formData.specs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('请输入商品名称');
      return;
    }
    if (!useSpecs) {
      if (!formData.price || parseFloat(formData.price) <= 0) {
        alert('请输入有效的商品价格');
        return;
      }
    } else {
      if (formData.skus.length === 0) {
        alert('请添加商品规格');
        return;
      }
      const hasInvalidPrice = formData.skus.some(sku => !sku.price || sku.price < 0);
      if (hasInvalidPrice) {
        alert('请填写所有规格的价格');
        return;
      }
    }

    try {
      setSaving(true);
      
      const data = {
        name: formData.name.trim(),
        title: formData.name.trim(),
        description: formData.description.trim(),
        images: formData.images,
        cover_image: formData.images[0] || '',
        descImages: formData.descImages,
        sellerId: formData.sellerId || 'default',
        categoryId: formData.categoryId || '',
        price: useSpecs ? undefined : parseFloat(formData.price),
        specs: useSpecs ? formData.specs : [],
        skus: useSpecs ? formData.skus : [],
        isHot: formData.isHot,
        isNew: formData.isNew,
        isDiscount: formData.isDiscount,
        tags: formData.tags,
      };

      let spuId = id;
      if (isEdit) {
        await goodsApi.update(id, data);
      } else {
        const result = await goodsApi.create(data);
        spuId = result?.data?._id || id;
      }

      // 同步 SKU 到云端
      if (useSpecs && spuId) {
        await syncSkusToCloud(spuId, data.name);
      }

      router.push('/goods');
    } catch (error) {
      console.error('保存商品失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 云端 SKU 管理组件
  function CloudSkuManager({ 
    spuId, 
    spuName,
    cloudSkus, 
    loading, 
    onRefresh 
  }: { 
    spuId: string;
    spuName: string;
    cloudSkus: any[];
    loading: boolean;
    onRefresh: () => void;
  }) {
    const [editingSku, setEditingSku] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // 快速添加 SKU
    const handleQuickAdd = async () => {
      try {
        setSaving(true);
        await skuApi.create({
          spu: { _id: spuId, name: spuName || '未命名商品' },
          description: '默认规格-' + Date.now(),
          price: 0,
          count: 0,
        });
        alert('SKU 创建成功');
        onRefresh();
      } catch (error) {
        console.error('创建 SKU 失败:', error);
        alert('创建失败');
      } finally {
        setSaving(false);
      }
    };

    // 更新 SKU
    const handleUpdate = async (skuId: string, data: any) => {
      try {
        setSaving(true);
        await skuApi.update(skuId, data);
        setEditingSku(null);
        onRefresh();
      } catch (error) {
        console.error('更新 SKU 失败:', error);
        alert('更新失败');
      } finally {
        setSaving(false);
      }
    };

    // 删除 SKU
    const handleDelete = async (skuId: string) => {
      if (!confirm('确定要删除这个 SKU 吗？')) return;
      try {
        setSaving(true);
        await skuApi.delete(skuId);
        onRefresh();
      } catch (error) {
        console.error('删除 SKU 失败:', error);
        alert('删除失败');
      } finally {
        setSaving(false);
      }
    };

    // 调整库存
    const handleStockChange = async (skuId: string, delta: number) => {
      try {
        const sku = cloudSkus.find(s => s._id === skuId);
        if (!sku) return;
        
        const newCount = (sku.count || 0) + delta;
        if (newCount < 0) {
          alert('库存不能为负数');
          return;
        }
        
        await skuApi.update(skuId, { count: newCount });
        onRefresh();
      } catch (error) {
        console.error('更新库存失败:', error);
        alert('更新失败');
      }
    };

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>云端 SKU 管理</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '刷新'}
              </Button>
              <Button type="button" size="sm" onClick={handleQuickAdd} disabled={saving}>
                <Plus className="h-4 w-4 mr-1" />
                添加 SKU
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">加载中...</p>
            </div>
          ) : cloudSkus.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无 SKU 数据</p>
              <p className="text-sm">点击"添加 SKU"或先设置规格保存后自动同步</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">规格描述</th>
                    <th className="px-4 py-2 text-left">价格</th>
                    <th className="px-4 py-2 text-left">库存</th>
                    <th className="px-4 py-2 text-left">创建时间</th>
                    <th className="px-4 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cloudSkus.map((sku) => (
                    <tr key={sku._id} className="border-t">
                      <td className="px-4 py-2">
                        {editingSku?._id === sku._id ? (
                          <Input
                            className="h-8"
                            value={editingSku.description}
                            onChange={(e) => setEditingSku({...editingSku, description: e.target.value})}
                          />
                        ) : (
                          sku.description || '-'
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {editingSku?._id === sku._id ? (
                          <Input
                            type="number"
                            className="h-8 w-24"
                            value={editingSku.price}
                            onChange={(e) => setEditingSku({...editingSku, price: parseFloat(e.target.value) || 0})}
                          />
                        ) : (
                          `¥${sku.price?.toFixed(2) || '0.00'}`
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {editingSku?._id === sku._id ? (
                          <Input
                            type="number"
                            className="h-8 w-24"
                            value={editingSku.count}
                            onChange={(e) => setEditingSku({...editingSku, count: parseInt(e.target.value) || 0})}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleStockChange(sku._id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center">{sku.count || 0}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleStockChange(sku._id, 1)}
                            >
                              <PlusCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {sku.createdAt ? new Date(sku.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingSku?._id === sku._id ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdate(sku._id, editingSku)}
                              disabled={saving}
                            >
                              保存
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSku(null)}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingSku({...sku})}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(sku._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? '编辑商品' : '添加商品'}</h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? '修改商品信息' : '创建新的商品'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">商品名称 *</Label>
                <Input
                  id="name"
                  placeholder="请输入商品名称"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">商品分类</Label>
                <select
                  id="categoryId"
                  className="w-full px-3 py-2 rounded-md border bg-background"
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                >
                  <option value="">请选择分类</option>
                  {categories.filter(c => !c.parentId).map((cat) => (
                    <optgroup key={cat._id} label={cat.name}>
                      <option value={cat._id}>{cat.name}</option>
                      {categories.filter(c => c.parentId === cat._id).map((child) => (
                        <option key={child._id} value={child._id}>  └ {child.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* 规格开关 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useSpecs"
                  checked={useSpecs}
                  onChange={(e) => handleUseSpecsChange(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="useSpecs" className="cursor-pointer">
                  启用多规格定价（如颜色、尺寸）
                </Label>
              </div>

              {/* 热门、新品和打折标记 */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isHot"
                    checked={formData.isHot}
                    onChange={(e) => setFormData(prev => ({ ...prev, isHot: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <Label htmlFor="isHot" className="cursor-pointer text-sm">
                    🔥 热门推荐
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isNew"
                    checked={formData.isNew}
                    onChange={(e) => setFormData(prev => ({ ...prev, isNew: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <Label htmlFor="isNew" className="cursor-pointer text-sm">
                    ✨ 新品上架
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDiscount"
                    checked={formData.isDiscount}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDiscount: e.target.checked }))}
                    className="w-4 h-4 accent-pink-500"
                  />
                  <Label htmlFor="isDiscount" className="cursor-pointer text-sm">
                    🏷️ 打折优惠
                  </Label>
                </div>
              </div>

              {!useSpecs ? (
                <div className="space-y-2">
                  <Label htmlFor="price">价格 *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    required={!useSpecs}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="description">商品描述</Label>
                <textarea
                  id="description"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="请输入商品描述"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              {/* 商品标签 */}
              <div className="space-y-2">
                <Label>商品标签</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-md">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          tags: prev.tags.filter((_, i) => i !== index)
                        }))}
                        className="hover:bg-primary/20 rounded-sm p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="输入标签，如：假一赔十、一件起发"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        const value = input.value.trim();
                        if (value && !formData.tags.includes(value)) {
                          setFormData(prev => ({ ...prev, tags: [...prev.tags, value] }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).parentElement?.previousElementSibling as HTMLInputElement;
                      const value = input?.value?.trim();
                      if (value && !formData.tags.includes(value)) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, value] }));
                        input.value = '';
                      }
                    }}
                  >
                    添加
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">按 Enter 或点击添加按钮添加标签</p>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>商品图片</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">点击上传图片</span>
                    <span className="text-muted-foreground"> 或拖拽文件到这里</span>
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  )}
                </div>
              </div>

              {imagePreviewUrls.filter(url => url && !url.startsWith('cloud://')).length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {imagePreviewUrls.filter(url => url && !url.startsWith('cloud://')).map((img, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                        <img
                          src={img}
                          alt={`商品图片 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {imagePreviewUrls.filter(url => url && !url.startsWith('cloud://')).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无图片</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 详情图片 */}
          <Card>
            <CardHeader>
              <CardTitle>详情介绍图片</CardTitle>
              <p className="text-sm text-muted-foreground">上传商品详情图片，将按顺序在商品详情页展示</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <Label htmlFor="desc-image-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">点击上传详情图片</span>
                    <span className="text-muted-foreground">（支持多张）</span>
                  </Label>
                  <Input
                    id="desc-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleDescImageUpload}
                    disabled={uploadingDesc}
                  />
                  {uploadingDesc && (
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  )}
                </div>
              </div>

              {descImagePreviewUrls.filter(url => url && !url.startsWith('cloud://')).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">拖拽调整顺序（图片将按此顺序展示）</p>
                  <div className="grid grid-cols-3 gap-4">
                    {descImagePreviewUrls.filter(url => url && !url.startsWith('cloud://')).map((img, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                          <img
                            src={img}
                            alt={`详情图片 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                            {index + 1}
                          </div>
                        </div>
                        <div className="absolute -top-2 -right-2 flex gap-1">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveDescImage(index, index - 1)}
                              className="p-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              title="上移"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                          )}
                          {index < descImagePreviewUrls.filter(url => url && !url.startsWith('cloud://')).length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveDescImage(index, index + 1)}
                              className="p-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              title="下移"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeDescImage(index)}
                            className="p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                            title="删除"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {descImagePreviewUrls.filter(url => url && !url.startsWith('cloud://')).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无详情图片</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 规格管理 */}
        {useSpecs && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>商品规格</span>
                <Button type="button" variant="outline" size="sm" onClick={addSpec}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加规格
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.specs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  点击"添加规格"来添加商品规格（如颜色、尺寸）
                </p>
              ) : (
                <>
                  {formData.specs.map((spec, specIndex) => (
                    <div key={specIndex} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Label>规格名称（如：颜色、尺寸）</Label>
                        <Input
                          placeholder="请输入规格名称"
                          value={spec.name}
                          onChange={(e) => updateSpecName(specIndex, e.target.value)}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>规格值（用逗号分隔）</Label>
                        <Input
                          placeholder="如：红色,蓝色,绿色"
                          value={spec.values.join(',')}
                          onChange={(e) => updateSpecValues(specIndex, e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpec(specIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* SKU 表格 */}
                  {formData.skus.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">规格定价</h4>
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              {formData.specs.map((spec, i) => (
                                <th key={i} className="px-4 py-2 text-left">{spec.name}</th>
                              ))}
                              <th className="px-4 py-2 text-left">价格</th>
                              <th className="px-4 py-2 text-left">库存</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.skus.map((sku) => (
                              <tr key={sku.id} className="border-t">
                                {sku.specValues.map((v, i) => (
                                  <td key={i} className="px-4 py-2">{v}</td>
                                ))}
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-24 h-8"
                                    value={sku.price}
                                    onChange={(e) => updateSku(sku.id, 'price', e.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-24 h-8"
                                    value={sku.stock}
                                    onChange={(e) => updateSku(sku.id, 'stock', e.target.value)}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 云端 SKU 管理（仅编辑模式） */}
        {isEdit && (
          <CloudSkuManager 
            spuId={id} 
            spuName={formData.name}
            cloudSkus={cloudSkus}
            loading={loadingSkus}
            onRefresh={() => loadCloudSkus(id)}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </div>
  );
}
