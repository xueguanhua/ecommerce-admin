'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { bannerApi, activityApi, uploadFile, getTempFileURLs, type Banner } from '@/lib/wechat-cloud';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Upload, X, ArrowUp, ArrowDown, Loader2, Package } from 'lucide-react';

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    imagePreview: '', // 用于预览的临时URL
    link: '',
    linkType: 'activity' as 'activity' | 'goods' | 'category' | 'url',
    position: 0,
    status: 'enabled' as 'enabled' | 'disabled',
  });

  // 活动选择相关
  const [activities, setActivities] = useState<any[]>([]);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const result = await bannerApi.list();
      const bannerList = result?.list || [];

      // 转换 cloud:// URL 为临时 URL 用于显示
      const cloudImages = bannerList
        .filter((b: Banner) => b.image?.startsWith('cloud://'))
        .map((b: Banner) => b.image);

      if (cloudImages.length > 0) {
        try {
          const tempUrls = await getTempFileURLs(cloudImages);
          const urlMap = new Map(tempUrls.map((item: any) => [item.fileID, item.tempFileURL]));

          bannerList.forEach((b: Banner) => {
            if (b.image?.startsWith('cloud://')) {
              (b as any).imagePreview = urlMap.get(b.image) || b.image;
            } else {
              (b as any).imagePreview = b.image;
            }
          });
        } catch (e) {
          console.error('获取临时URL失败:', e);
          bannerList.forEach((b: Banner) => {
            (b as any).imagePreview = b.image;
          });
        }
      } else {
        bannerList.forEach((b: Banner) => {
          (b as any).imagePreview = b.image;
        });
      }

      setBanners(bannerList);
    } catch (error) {
      console.error('加载轮播图失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image: '',
      imagePreview: '',
      link: '',
      linkType: 'activity',
      position: banners.length + 1,
      status: 'enabled',
    });
    setEditingBanner(null);
  };

  // 加载活动列表
  const loadActivities = async () => {
    try {
      const res = await activityApi.getList({ isActive: true });
      const list = res.data?.list || [];
      
      // 转换活动封面图片
      const cloudImages = list
        .filter((a: any) => a.coverImage?.startsWith('cloud://'))
        .map((a: any) => a.coverImage);
      
      if (cloudImages.length > 0) {
        try {
          const tempUrls = await getTempFileURLs(cloudImages);
          const urlMap = new Map(tempUrls.map((item: any) => [item.fileID, item.tempFileURL]));
          list.forEach((a: any) => {
            if (a.coverImage?.startsWith('cloud://')) {
              a.coverImagePreview = urlMap.get(a.coverImage) || a.coverImage;
            } else {
              a.coverImagePreview = a.coverImage;
            }
          });
        } catch (e) {
          list.forEach((a: any) => { a.coverImagePreview = a.coverImage; });
        }
      } else {
        list.forEach((a: any) => { a.coverImagePreview = a.coverImage; });
      }
      
      setActivities(list);
    } catch (error) {
      console.error('加载活动列表失败:', error);
    }
  };

  const handleOpenModal = async (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title,
        image: banner.image,
        imagePreview: (banner as any).imagePreview || banner.image,
        link: banner.link || '',
        linkType: banner.linkType || 'activity',
        position: banner.position,
        status: banner.status,
      });
      // 如果是活动类型，加载活动列表用于显示活动名称
      if (banner.linkType === 'activity' && banner.link) {
        await loadActivities();
      }
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      // 上传到云存储
      const fileId = await uploadFile(file);
      // 获取临时URL用于预览
      const tempUrls = await getTempFileURLs([fileId]);
      const previewUrl = tempUrls[0]?.tempFileURL || fileId;

      setFormData({
        ...formData,
        image: fileId,           // 存储 fileID
        imagePreview: previewUrl, // 预览URL
      });
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('上传图片失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.image) {
      alert('请填写标题和上传图片');
      return;
    }

    try {
      setSaving(true);

      if (editingBanner) {
        // 更新
        await bannerApi.update(editingBanner._id, {
          title: formData.title,
          image: formData.image,
          link: formData.link,
          linkType: formData.linkType,
          position: formData.position,
          status: formData.status,
        });
      } else {
        // 创建
        await bannerApi.create({
          title: formData.title,
          image: formData.image,
          link: formData.link,
          linkType: formData.linkType,
          position: formData.position,
          status: formData.status,
        });
      }

      setShowModal(false);
      resetForm();
      loadBanners(); // 刷新列表
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个轮播图吗？')) return;

    try {
      await bannerApi.delete(id);
      loadBanners(); // 刷新列表
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleStatusChange = async (banner: Banner) => {
    const newStatus = banner.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await bannerApi.update(banner._id, { status: newStatus });
      loadBanners(); // 刷新列表
    } catch (error) {
      console.error('状态更新失败:', error);
      alert('状态更新失败，请重试');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= banners.length) return;

    const newBanners = [...banners];
    [newBanners[index], newBanners[newIndex]] = [newBanners[newIndex], newBanners[index]];

    // 更新位置
    newBanners.forEach((b, i) => {
      b.position = i + 1;
    });

    try {
      await bannerApi.reorder(newBanners.map(b => b._id));
      setBanners(newBanners);
    } catch (error) {
      console.error('排序失败:', error);
      alert('排序失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">轮播图管理</h1>
          <p className="text-muted-foreground mt-1">管理首页轮播图</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          添加轮播图
        </Button>
      </div>

      {/* Banner Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无轮播图</p>
            <Button variant="outline" className="mt-4" onClick={() => handleOpenModal()}>
              添加第一个轮播图
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner, index) => (
            <Card key={banner._id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* 排序按钮 */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === banners.length - 1}
                      onClick={() => handleMove(index, 'down')}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* 图片 */}
                  <div className="w-[200px] h-[80px] rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={(banner as any).imagePreview || banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{banner.title}</h3>
                      <Badge variant={banner.status === 'enabled' ? 'default' : 'secondary'}>
                        {banner.status === 'enabled' ? '启用' : '禁用'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      位置: {banner.position} | 
                      跳转: {banner.linkType === 'activity' ? '活动' : banner.linkType === 'goods' ? '商品' : banner.linkType === 'category' ? '分类' : 'URL'}
                      {banner.link && banner.linkType !== 'url' && ` (${banner.link})`}
                    </p>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(banner)}
                    >
                      {banner.status === 'enabled' ? '禁用' : '启用'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(banner)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(banner._id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingBanner ? '编辑轮播图' : '添加轮播图'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>标题 *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入轮播图标题"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>图片 *</Label>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    {formData.imagePreview ? (
                      <div className="relative">
                        <img
                          src={formData.imagePreview}
                          alt="轮播图"
                          className="w-full h-[150px] object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => setFormData({ ...formData, image: '', imagePreview: '' })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <Label htmlFor="banner-upload" className="cursor-pointer mt-2 block">
                          <span className="text-primary hover:underline">点击上传图片</span>
                        </Label>
                        <Input
                          id="banner-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                        {uploading && <p className="text-sm text-muted-foreground mt-2">上传中...</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>跳转类型</Label>
                  <select
                    className="w-full px-3 py-2 rounded-md border bg-background"
                    value={formData.linkType}
                    onChange={(e) => setFormData({ ...formData, linkType: e.target.value as any, link: '' })}
                  >
                    <option value="activity">主题活动</option>
                    <option value="goods">商品详情</option>
                    <option value="category">商品分类</option>
                    <option value="url">网页链接</option>
                  </select>
                </div>

                {formData.linkType === 'activity' ? (
                  <div className="space-y-2">
                    <Label>关联活动</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={formData.link}
                        readOnly
                        placeholder="请选择活动"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          await loadActivities();
                          setIsActivityDialogOpen(true);
                        }}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        选择
                      </Button>
                    </div>
                    {formData.link && activities.find((a: any) => a._id === formData.link) && (
                      <div className="mt-2 p-3 border rounded-lg flex items-center gap-3">
                        {activities.find((a: any) => a._id === formData.link)?.coverImagePreview && (
                          <img
                            src={activities.find((a: any) => a._id === formData.link)?.coverImagePreview}
                            alt=""
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <span className="flex-1">{activities.find((a: any) => a._id === formData.link)?.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setFormData({ ...formData, link: '' })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>跳转链接</Label>
                    <Input
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder={formData.linkType === 'goods' ? '商品ID' : formData.linkType === 'category' ? '分类ID' : 'https://...'}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>排序位置</Label>
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
                    id="banner-status"
                    checked={formData.status === 'enabled'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'enabled' : 'disabled' })}
                  />
                  <Label htmlFor="banner-status" className="cursor-pointer">启用</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
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

      {/* 活动选择对话框 */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>选择关联活动</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto">
            <div className="grid gap-3">
              {activities.map((activity: any) => (
                <div
                  key={activity._id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center gap-3 ${
                    formData.link === activity._id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => {
                    setFormData({ ...formData, link: activity._id });
                    setIsActivityDialogOpen(false);
                  }}
                >
                  {activity.coverImagePreview ? (
                    <img
                      src={activity.coverImagePreview}
                      alt={activity.title}
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activity.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>
                  </div>
                  {formData.link === activity._id && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  暂无活动数据
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
