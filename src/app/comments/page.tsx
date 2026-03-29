'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { commentApi, type Comment } from '@/lib/wechat-cloud';
import { Search, Star, Check, X, MessageSquare, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

const statusMap = {
  pending: { label: '待审核', color: 'bg-yellow-500' },
  approved: { label: '已通过', color: 'bg-green-500' },
  rejected: { label: '已拒绝', color: 'bg-red-500' },
};

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadComments();
  }, [statusFilter, page]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const result = await commentApi.getAllList({
        status: statusFilter || undefined,
        keyword: searchKeyword || undefined,
        page,
        pageSize,
      });

      // 转换时间字段
      const formattedComments = (result?.list || []).map((c: any) => ({
        ...c,
        createTime: c.createTime ? new Date(c.createTime) : new Date(),
        replyTime: c.replyTime ? new Date(c.replyTime) : undefined,
      }));

      setComments(formattedComments);
      setTotal(result?.total || 0);
    } catch (error) {
      console.error('加载评论失败:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadComments();
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await commentApi.updateStatus(id, status);
      setComments(comments.map(c =>
        c._id === id ? { ...c, status } : c
      ));
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  const handleReply = async (id: string) => {
    if (!replyContent.trim()) return;

    try {
      setSaving(true);
      await commentApi.reply(id, replyContent);
      setComments(comments.map(c =>
        c._id === id ? { ...c, reply: replyContent, replyTime: new Date() } : c
      ));
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('回复失败:', error);
      alert('回复失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await commentApi.delete(id);
      setComments(comments.filter(c => c._id !== id));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">评论管理</h1>
        <p className="text-muted-foreground mt-1">管理用户商品评价</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>评论列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索商品、用户、内容..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
            <select
              className="px-3 py-2 rounded-md border bg-background"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">全部状态</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无评论</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>评分</TableHead>
                  <TableHead>评论内容</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((comment) => (
                  <TableRow key={comment._id}>
                    <TableCell className="font-medium max-w-[150px] truncate" title={comment.goodsName || comment.spuId}>
                      {comment.goodsName || comment.spuId}
                    </TableCell>
                    <TableCell>{comment.userName || '匿名用户'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < comment.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{comment.content}</p>
                      {comment.images && comment.images.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          <ImageIcon size={14} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{comment.images.length}张图片</span>
                        </div>
                      )}
                      {comment.reply && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <span className="text-muted-foreground">回复: </span>
                          {comment.reply}
                        </div>
                      )}
                      {replyingTo === comment._id && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="输入回复内容"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleReply(comment._id)} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '发送'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                            取消
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMap[comment.status]?.color || 'bg-gray-500'}>
                        {statusMap[comment.status]?.label || comment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{comment.createTime.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {comment.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(comment._id, 'approved')}
                              title="通过"
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(comment._id, 'rejected')}
                              title="拒绝"
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setReplyingTo(comment._id)}
                          title="回复"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(comment._id)}
                          title="删除"
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

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              共 {total} 条评论
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={comments.length < pageSize || loading}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
