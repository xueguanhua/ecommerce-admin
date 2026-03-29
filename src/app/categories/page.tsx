'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { categoryApi, uploadFile, getTempFileURLs, type Category } from '@/lib/wechat-cloud';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Upload, X, ArrowUp, ArrowDown, Loader2, ChevronRight, ChevronDown, FolderTree } from 'lucide-react';

// 将扁平数据转为树形
const buildTree = (categories: Category[]): Category[] => {
  const map: Record<string, Category> = {};
  const roots: Category[] = [];

  categories.forEach(cat => {
    map[cat._id] = { ...cat, children: [] };
  });

  categories.forEach(cat => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children!.push(map[cat._id]);
    } else {
      roots.push(map[cat._id]);
    }
  });

  // 按position排序
  const sortByPosition = (items: Category[]) => {
    items.sort((a, b) => a.position - b.position);
    items.forEach(item => {
      if (item.children?.length) sortByPosition(item.children);
    });
  };
  sortByPosition(roots);

  return roots;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    icon: '',
    image: '',
    description: '',
    position: 0,
    status: 'enabled' as 'enabled' | 'disabled',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const result = await categoryApi.list({});
      let list = result?.list || [];
      
      // 批量获取图片临时URL
      const imagesToConvert = list
        .filter((c: Category) => c.image && c.image.startsWith('cloud://'))
        .map((c: Category) => c.image);
      
      if (imagesToConvert.length > 0) {
        try {
          const tempUrls = await getTempFileURLs(imagesToConvert);
          const urlMap = new Map(tempUrls.map((item: {fileID: string; tempFileURL: string}) => [item.fileID, item.tempFileURL]));
          
          list = list.map((c: Category) => ({
            ...c,
            image: c.image?.startsWith('cloud://') 
              ? (urlMap.get(c.image) || c.image)
              : c.image
          }));
        } catch (e) {
          console.error('获取图片临时URL失败:', e);
        }
      }
      
      setCategories(list);
    } catch (error) {
      console.error('加载分类失败:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const categoryTree = buildTree(categories);

  const resetForm = () => {
    setFormData({
      name: '',
      parentId: '',
      icon: '',
      image: '',
      description: '',
      position: categories.filter(c => !formData.parentId || c.parentId === formData.parentId).length + 1,
      status: 'enabled',
    });
    setEditingCategory(null);
    setImagePreviewUrl('');
  };

  const handleOpenModal = async (category?: Category, parentId?: string) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        parentId: category.parentId || '',
        icon: category.icon || '',
        image: category.image || '',
        description: category.description || '',
        position: category.position,
        status: category.status,
      });
      
      // 如果已有图片且是 cloud:// 格式，获取临时URL
      if (category.image && category.image.startsWith('cloud://')) {
        try {
          const tempUrls = await getTempFileURLs([category.image]);
          setImagePreviewUrl(tempUrls[0]?.tempFileURL || '');
        } catch (e) {
          console.error('获取图片临时URL失败:', e);
          setImagePreviewUrl('');
        }
      } else {
        setImagePreviewUrl(category.image || '');
      }
    } else {
      resetForm();
      setImagePreviewUrl('');
      if (parentId) {
        setFormData(prev => ({ ...prev, parentId }));
      }
    }
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      // 先创建本地预览
      const localPreview = URL.createObjectURL(file);
      setImagePreviewUrl(localPreview);
      
      // 上传到云存储
      const fileId = await uploadFile(file);
      
      // 获取临时URL用于显示
      const tempUrls = await getTempFileURLs([fileId]);
      const previewUrl = tempUrls[0]?.tempFileURL || fileId;
      
      setFormData({ ...formData, image: fileId });
      setImagePreviewUrl(previewUrl);
      
      // 清理本地预览URL
      URL.revokeObjectURL(localPreview);
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('上传图片失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('请输入分类名称');
      return;
    }

    try {
      setSaving(true);
      
      if (editingCategory) {
        // 更新
        await categoryApi.update(editingCategory._id, {
          name: formData.name,
          parentId: formData.parentId || undefined,
          icon: formData.icon,
          image: formData.image,
          description: formData.description,
          position: formData.position,
          status: formData.status,
        });
      } else {
        // 创建
        await categoryApi.create({
          name: formData.name,
          parentId: formData.parentId || undefined,
          icon: formData.icon,
          image: formData.image,
          description: formData.description,
          position: formData.position,
          status: formData.status,
        });
      }
      
      setShowModal(false);
      setImagePreviewUrl('');
      resetForm();
      await loadCategories();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const hasChildren = categories.some(c => c.parentId === id);
    if (hasChildren) {
      alert('请先删除子分类');
      return;
    }
    if (!confirm('确定要删除这个分类吗？')) return;
    
    try {
      await categoryApi.delete(id);
      await loadCategories();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const handleStatusChange = async (category: Category) => {
    const newStatus = category.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await categoryApi.update(category._id, { status: newStatus });
      await loadCategories();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // 获取顶级分类选项
  const topLevelCategories = categories.filter(c => !c.parentId);

  // 存储预览URL的状态
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  // 获取图片预览URL
  const getImagePreview = (image: string) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    return imagePreviewUrl || null;
  };

  // 渲染分类行
  const renderCategoryRow = (category: Category, level: number = 0): React.ReactNode => {
    const hasChildren = categories.some(c => c.parentId === category._id);
    const isExpanded = expandedIds.has(category._id);

    return (
      <>
        <tr key={category._id} className="hover:bg-muted/50">
          <td className="py-3">
            <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(category._id)}
                  className="p-1 hover:bg-muted rounded mr-1"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <span className="font-medium">{category.name}</span>
            </div>
          </td>
          <td className="py-3">
            {category.level === 1 ? (
              <Badge variant="secondary">一级</Badge>
            ) : (
              <Badge>二级</Badge>
            )}
          </td>
          <td className="py-3">
            {category.image ? (
              <img 
                src={category.image.startsWith('cloud://') ? '' : category.image} 
                alt={category.name} 
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  // 图片加载失败时显示默认图标
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            {(!category.image || category.image.startsWith('cloud://')) && (
              <FolderTree className={`w-10 h-10 text-muted-foreground ${category.image ? 'hidden' : ''}`} />
            )}
          </td>
          <td className="py-3">{category.goodsCount || 0}</td>
          <td className="py-3">
            <Badge variant={category.status === 'enabled' ? 'default' : 'secondary'}>
              {category.status === 'enabled' ? '启用' : '禁用'}
            </Badge>
          </td>
          <td className="py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(undefined, category._id)}
                title="添加子分类"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenModal(category)}
                title="编辑"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStatusChange(category)}
                title={category.status === 'enabled' ? '禁用' : '启用'}
              >
                {category.status === 'enabled' ? (
                  <span className="text-xs">禁用</span>
                ) : (
                  <span className="text-xs">启用</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(category._id)}
                title="删除"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && category.children?.map(child => renderCategoryRow(child, level + 1))}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">分类管理</h1>
          <p className="text-muted-foreground mt-1">管理商品分类</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          添加分类
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分类列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无分类</p>
              <Button variant="outline" className="mt-4" onClick={() => handleOpenModal()}>
                添加第一个分类
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分类名称</TableHead>
                  <TableHead>层级</TableHead>
                  <TableHead>图标</TableHead>
                  <TableHead>商品数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryTree.map(category => renderCategoryRow(category, 0))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingCategory ? '编辑分类' : '添加分类'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>分类名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入分类名称"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>父分类</Label>
                  <select
                    className="w-full px-3 py-2 rounded-md border bg-background"
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  >
                    <option value="">顶级分类</option>
                    {topLevelCategories
                      .filter(c => !editingCategory || c._id !== editingCategory._id)
                      .map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>分类图标/图片</Label>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    {formData.image ? (
                      <div className="relative">
                        <img
                          src={imagePreviewUrl || (formData.image.startsWith('http') ? formData.image : '')}
                          alt="分类图片"
                          className="w-full h-[120px] object-cover rounded"
                          onError={(e) => {
                            // 如果图片加载失败，显示占位符
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setFormData({ ...formData, image: '' });
                            setImagePreviewUrl('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <Label htmlFor="category-upload" className="cursor-pointer mt-2 block">
                          <span className="text-primary hover:underline">点击上传图片</span>
                        </Label>
                        <Input
                          id="category-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>分类描述</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="请输入分类描述"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>排序</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="category-status"
                    checked={formData.status === 'enabled'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'enabled' : 'disabled' })}
                  />
                  <Label htmlFor="category-status" className="cursor-pointer">启用</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); setImagePreviewUrl(''); }}>
                    取消
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
