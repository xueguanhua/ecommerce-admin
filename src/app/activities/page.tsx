'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Search, Sparkles, Upload, X, Package } from 'lucide-react';
import { activityApi, goodsApi, uploadFile, getTempFileURLs } from '@/lib/wechat-cloud';

// 从临时URL中提取 fileID（如果可能）
function extractFileID(url: string): string {
  // 如果已经是 cloud:// 格式，直接返回
  if (url.startsWith('cloud://')) {
    return url;
  }
  // 否则返回原URL（可能是外部图片链接）
  return url;
}
import { toast } from 'sonner';

interface ActivityGoods {
  goodsId: string;
  name: string;
  image: string;
  intro: string;
}

interface Activity {
  _id?: string;
  title: string;
  description: string;
  coverImage: string;
  goodsList: ActivityGoods[];
  isActive: boolean;
  sort: number;
  createTime?: string;
  updateTime?: string;
}

interface GoodsItem {
  _id: string;
  name: string;
  images: string[];
  minPrice: number;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGoodsDialogOpen, setIsGoodsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<Activity>({
    title: '',
    description: '',
    coverImage: '',
    goodsList: [],
    isActive: true,
    sort: 0,
  });
  // 封面预览URL（临时URL用于显示）
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  
  // 商品选择相关
  const [goodsList, setGoodsList] = useState<GoodsItem[]>([]);
  const [goodsLoading, setGoodsLoading] = useState(false);
  const [goodsSearch, setGoodsSearch] = useState('');
  const [selectedGoodsIds, setSelectedGoodsIds] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载活动列表
  const loadActivities = async () => {
    setLoading(true);
    try {
      const res = await activityApi.getList();
      // 兼容旧数据格式
      const list = (res.data?.list || []).map((item: any) => ({
        ...item,
        goodsList: item.goodsList || item.goodsIds?.map((id: string) => ({ goodsId: id, name: '', image: '', intro: '' })) || [],
      }));
      
      // 收集需要转换的 cloud:// 图片
      const fileIDs: string[] = [];
      const imageMap: { [key: string]: string } = {};
      
      list.forEach((item: any) => {
        if (item.coverImage && item.coverImage.startsWith('cloud://')) {
          fileIDs.push(item.coverImage);
        }
      });
      
      // 如果有 cloud:// 图片，批量获取临时URL
      if (fileIDs.length > 0) {
        try {
          const tempURLs = await getTempFileURLs(fileIDs);
          tempURLs.forEach((result: any) => {
            imageMap[result.fileID] = result.tempFileURL || result.url;
          });
          
          // 替换为临时URL
          list.forEach((item: any) => {
            if (item.coverImage && imageMap[item.coverImage]) {
              item.coverImage = imageMap[item.coverImage];
            }
          });
        } catch (e) {
          console.error('获取临时URL失败:', e);
        }
      }
      
      setActivities(list);
    } catch (error) {
      toast.error('加载活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  // 加载商品列表
  const loadGoods = async () => {
    setGoodsLoading(true);
    try {
      const res = await goodsApi.list({ limit: 100 });
      setGoodsList(res.data?.list || []);
    } catch (error) {
      toast.error('加载商品列表失败');
    } finally {
      setGoodsLoading(false);
    }
  };

  // 打开商品选择对话框
  const openGoodsDialog = async () => {
    await loadGoods();
    setSelectedGoodsIds(formData.goodsList.map(g => g.goodsId));
    setIsGoodsDialogOpen(true);
  };

  // 确认选择商品
  const confirmGoodsSelection = () => {
    const newGoodsList = selectedGoodsIds.map(id => {
      const existing = formData.goodsList.find(g => g.goodsId === id);
      if (existing) return existing;
      const goods = goodsList.find(g => g._id === id);
      return {
        goodsId: id,
        name: goods?.name || '',
        image: goods?.images?.[0] || '',
        intro: '',
      };
    });
    setFormData({ ...formData, goodsList: newGoodsList });
    setIsGoodsDialogOpen(false);
  };

  // 移除已选商品
  const removeGoods = (goodsId: string) => {
    setFormData({
      ...formData,
      goodsList: formData.goodsList.filter(g => g.goodsId !== goodsId),
    });
  };

  // 更新商品介绍
  const updateGoodsIntro = (goodsId: string, intro: string) => {
    setFormData({
      ...formData,
      goodsList: formData.goodsList.map(g =>
        g.goodsId === goodsId ? { ...g, intro } : g
      ),
    });
  };

  // 上传图片：存储 fileID，显示临时URL
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 上传文件获取 fileID
      const fileID = await uploadFile(file);
      // 获取临时访问URL用于预览
      const tempURLs = await getTempFileURLs([fileID]);
      const tempUrl = tempURLs[0]?.tempFileURL || tempURLs[0]?.url || fileID;
      // 存储 fileID 到 formData，临时URL用于预览
      setFormData({ ...formData, coverImage: fileID });
      setCoverPreviewUrl(tempUrl);
      toast.success('图片上传成功');
    } catch (error) {
      toast.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 保存活动
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入活动标题');
      return;
    }

    try {
      // 剔除服务端自动生成的字段
      const { _id, createTime, updateTime, ...submitData } = formData;
      
      if (editingActivity?._id) {
        await activityApi.update(editingActivity._id, submitData);
        toast.success('活动更新成功');
      } else {
        await activityApi.create(submitData);
        toast.success('活动创建成功');
      }
      setIsDialogOpen(false);
      setEditingActivity(null);
      setCoverPreviewUrl('');
      setFormData({
        title: '',
        description: '',
        coverImage: '',
        goodsList: [],
        isActive: true,
        sort: 0,
      });
      loadActivities();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 删除活动
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个活动吗？')) return;

    try {
      await activityApi.delete(id);
      toast.success('删除成功');
      loadActivities();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 编辑活动
  const handleEdit = async (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({ ...activity });
    // 如果有封面图，获取临时URL用于预览
    if (activity.coverImage) {
      if (activity.coverImage.startsWith('cloud://')) {
        try {
          const tempURLs = await getTempFileURLs([activity.coverImage]);
          setCoverPreviewUrl(tempURLs[0]?.tempFileURL || tempURLs[0]?.url || activity.coverImage);
        } catch (e) {
          setCoverPreviewUrl(activity.coverImage);
        }
      } else {
        setCoverPreviewUrl(activity.coverImage);
      }
    } else {
      setCoverPreviewUrl('');
    }
    setIsDialogOpen(true);
  };

  // 新增活动
  const handleAdd = () => {
    setEditingActivity(null);
    setFormData({
      title: '',
      description: '',
      coverImage: '',
      goodsList: [],
      isActive: true,
      sort: 0,
    });
    setCoverPreviewUrl('');
    setIsDialogOpen(true);
  };

  const filteredActivities = activities.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGoods = goodsList.filter(g =>
    g.name.toLowerCase().includes(goodsSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">主题活动</h1>
          <p className="text-muted-foreground mt-1">管理小程序首页的主题活动模块</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus size={18} />
          新建活动
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="搜索活动名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            活动列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>封面</TableHead>
                <TableHead>活动名称</TableHead>
                <TableHead>推荐商品</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>排序</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow key={activity._id}>
                  <TableCell>
                    {activity.coverImage ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden">
                        <img
                          src={activity.coverImage}
                          alt={activity.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Sparkles className="text-muted-foreground" size={24} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{activity.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {activity.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {activity.goodsList?.length || 0} 个商品
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activity.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {activity.isActive ? '启用' : '禁用'}
                    </span>
                  </TableCell>
                  <TableCell>{activity.sort}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(activity)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(activity._id!)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredActivities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    暂无活动数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? '编辑活动' : '新建活动'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>活动标题 *</Label>
              <Input
                placeholder="请输入活动标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>活动介绍</Label>
              <Textarea
                placeholder="请输入活动介绍"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* 封面上传 */}
            <div className="space-y-2">
              <Label>封面图片</Label>
              <div className="flex items-center gap-4">
                {coverPreviewUrl ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                    <img
                      src={coverPreviewUrl}
                      alt="预览"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setFormData({ ...formData, coverImage: '' });
                        setCoverPreviewUrl('');
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    ) : (
                      <>
                        <Upload className="text-muted-foreground" size={24} />
                        <span className="text-xs text-muted-foreground">点击上传</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* 商品选择 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>好物推荐</Label>
                <Button type="button" variant="outline" size="sm" onClick={openGoodsDialog} className="gap-1">
                  <Package size={14} />
                  选择商品
                </Button>
              </div>
              
              {formData.goodsList.length > 0 ? (
                <div className="space-y-3">
                  {formData.goodsList.map((goods, index) => (
                    <div key={goods.goodsId} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                        {goods.image && (
                          <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                            <img src={goods.image} alt={goods.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="font-medium flex-1">{goods.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeGoods(goods.goodsId)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                      <div className="pl-9">
                        <Textarea
                          placeholder="填写这段商品的介绍文案..."
                          rows={2}
                          value={goods.intro}
                          onChange={(e) => updateGoodsIntro(goods.goodsId, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">暂无推荐商品</p>
                  <Button type="button" variant="link" size="sm" onClick={openGoodsDialog}>
                    去选择商品
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label>排序</Label>
                <Input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>启用</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); setCoverPreviewUrl(''); }}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 商品选择对话框 */}
      <Dialog open={isGoodsDialogOpen} onOpenChange={setIsGoodsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>选择推荐商品</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="搜索商品..."
                value={goodsSearch}
                onChange={(e) => setGoodsSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex-1 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>价格</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGoods.map((goods) => (
                    <TableRow key={goods._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedGoodsIds.includes(goods._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedGoodsIds([...selectedGoodsIds, goods._id]);
                            } else {
                              setSelectedGoodsIds(selectedGoodsIds.filter(id => id !== goods._id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {goods.images?.[0] && (
                            <div className="w-10 h-10 rounded overflow-hidden">
                              <img src={goods.images[0]} alt={goods.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span className="font-medium">{goods.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>¥{goods.minPrice}</TableCell>
                    </TableRow>
                  ))}
                  {filteredGoods.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        暂无商品
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              已选择 {selectedGoodsIds.length} 个商品
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsGoodsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmGoodsSelection}>
              确认选择
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
