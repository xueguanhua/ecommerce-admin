'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { orderApi, type Order } from '@/lib/wechat-cloud';
import { Search, Package, Truck, CheckCircle, XCircle, RotateCcw, Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';

const statusMap = {
  pending: { label: '待支付', color: 'bg-yellow-500', icon: Loader2 },
  paid: { label: '已支付', color: 'bg-blue-500', icon: CheckCircle },
  shipped: { label: '已发货', color: 'bg-purple-500', icon: Truck },
  completed: { label: '已完成', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'bg-gray-500', icon: XCircle },
  refunded: { label: '已退款', color: 'bg-red-500', icon: RotateCcw },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [shipData, setShipData] = useState({ expressCompany: '', expressNo: '' });
  const [saving, setSaving] = useState(false);

  // 模拟数据
  const mockOrders: Order[] = [
    {
      _id: '1',
      orderNo: 'ORDER202401150001',
      userId: 'u1',
      userName: '张三',
      userPhone: '13800138000',
      address: '北京市朝阳区xxx街道xxx小区1号楼101',
      items: [
        { goodsId: 'g1', goodsName: 'iPhone 15 Pro', image: 'https://picsum.photos/100?random=1', price: 8999, quantity: 1 },
      ],
      totalAmount: 8999,
      freight: 0,
      status: 'completed',
      payTime: new Date('2024-01-15'),
      completeTime: new Date('2024-01-18'),
      createTime: new Date('2024-01-15'),
      updateTime: new Date('2024-01-18'),
    },
    {
      _id: '2',
      orderNo: 'ORDER202401160001',
      userId: 'u2',
      userName: '李四',
      userPhone: '13900139000',
      address: '上海市浦东新区xxx路xxx号',
      items: [
        { goodsId: 'g2', goodsName: 'MacBook Air', image: 'https://picsum.photos/100?random=2', price: 9499, quantity: 1 },
        { goodsId: 'g3', goodsName: 'AirPods Pro', image: 'https://picsum.photos/100?random=3', price: 1999, quantity: 1 },
      ],
      totalAmount: 11498,
      freight: 10,
      status: 'shipped',
      payTime: new Date('2024-01-16'),
      shipTime: new Date('2024-01-17'),
      expressNo: 'SF1234567890',
      expressCompany: '顺丰速运',
      createTime: new Date('2024-01-16'),
      updateTime: new Date('2024-01-17'),
    },
    {
      _id: '3',
      orderNo: 'ORDER202401170001',
      userId: 'u3',
      userName: '王五',
      userPhone: '13700137000',
      address: '广州市天河区xxx大道xxx号',
      items: [
        { goodsId: 'g4', goodsName: 'iPad Pro', image: 'https://picsum.photos/100?random=4', price: 6999, quantity: 1 },
      ],
      totalAmount: 6999,
      freight: 0,
      status: 'paid',
      payTime: new Date('2024-01-17'),
      createTime: new Date('2024-01-17'),
      updateTime: new Date('2024-01-17'),
    },
    {
      _id: '4',
      orderNo: 'ORDER202401180001',
      userId: 'u4',
      userName: '赵六',
      userPhone: '13600136000',
      address: '深圳市南山区xxx科技园xxx栋',
      items: [
        { goodsId: 'g5', goodsName: 'Apple Watch', image: 'https://picsum.photos/100?random=5', price: 3299, quantity: 2 },
      ],
      totalAmount: 6598,
      freight: 0,
      status: 'pending',
      createTime: new Date('2024-01-18'),
      updateTime: new Date('2024-01-18'),
    },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      // 实际调用 API
      // const result = await orderApi.list({ status: statusFilter || undefined });
      // setOrders(result?.data || []);
      
      setTimeout(() => {
        setOrders(mockOrders);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('加载订单失败:', error);
      setLoading(false);
    }
  };

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    try {
      // await orderApi.updateStatus(order._id, newStatus);
      setOrders(orders.map(o => 
        o._id === order._id ? { ...o, status: newStatus, updateTime: new Date() } : o
      ));
      setShowModal(false);
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleShip = async (order: Order) => {
    if (!shipData.expressCompany || !shipData.expressNo) {
      alert('请填写快递公司和单号');
      return;
    }

    try {
      setSaving(true);
      // await orderApi.ship(order._id, shipData.expressCompany, shipData.expressNo);
      setOrders(orders.map(o => 
        o._id === order._id 
          ? { 
              ...o, 
              status: 'shipped' as const, 
              expressCompany: shipData.expressCompany,
              expressNo: shipData.expressNo,
              shipTime: new Date(),
              updateTime: new Date()
            } 
          : o
      ));
      setShowModal(false);
      setShipData({ expressCompany: '', expressNo: '' });
    } catch (error) {
      console.error('发货失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const openShipModal = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const filteredOrders = orders.filter(o => {
    const matchKeyword = !searchKeyword || 
      o.orderNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      o.userName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      o.userPhone.includes(searchKeyword);
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchKeyword && matchStatus;
  });

  // 统计
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">订单管理</h1>
        <p className="text-muted-foreground mt-1">管理用户订单</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">总订单</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">待支付</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">待发货</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-500">{stats.shipped}</div>
            <div className="text-sm text-muted-foreground">待收货</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">已完成</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>订单列表</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索订单号、用户..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="px-3 py-2 rounded-md border bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="pending">待支付</option>
              <option value="paid">已支付</option>
              <option value="shipped">已发货</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
              <option value="refunded">已退款</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无订单</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.orderNo}</TableCell>
                    <TableCell>
                      <div>{order.userName}</div>
                      <div className="text-xs text-muted-foreground">{order.userPhone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.items.slice(0, 2).map((item, i) => (
                          <img
                            key={i}
                            src={item.image}
                            alt={item.goodsName}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ))}
                        {order.items.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{order.items.length - 2}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {order.items[0].goodsName}
                        {order.items.length > 1 && ` 等${order.items.length}件`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(order.totalAmount)}</div>
                      {order.freight > 0 && (
                        <div className="text-xs text-muted-foreground">运费: {formatPrice(order.freight)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMap[order.status].color}>
                        {statusMap[order.status].label}
                      </Badge>
                      {order.expressNo && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.expressCompany}: {order.expressNo}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(order.createTime)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {order.status === 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openShipModal(order)}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            发货
                          </Button>
                        )}
                        {order.status === 'shipped' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(order, 'completed')}
                          >
                            确认完成
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openShipModal(order)}
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            共 {filteredOrders.length} 个订单
          </div>
        </CardContent>
      </Card>

      {/* 发货弹窗 */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>订单详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">订单号:</span>
                  <span className="ml-2 font-medium">{selectedOrder.orderNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">状态:</span>
                  <Badge className={`ml-2 ${statusMap[selectedOrder.status].color}`}>
                    {statusMap[selectedOrder.status].label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">用户:</span>
                  <span className="ml-2">{selectedOrder.userName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">电话:</span>
                  <span className="ml-2">{selectedOrder.userPhone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">地址:</span>
                  <span className="ml-2">{selectedOrder.address}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">商品信息</h4>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <img src={item.image} alt={item.goodsName} className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1">
                      <div className="font-medium">{item.goodsName}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(item.price)} x {item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t">
                  <span>运费</span>
                  <span>{formatPrice(selectedOrder.freight)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>合计</span>
                  <span>{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {selectedOrder.status === 'paid' && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium">发货</h4>
                  <Input
                    placeholder="快递公司"
                    value={shipData.expressCompany}
                    onChange={(e) => setShipData({ ...shipData, expressCompany: e.target.value })}
                  />
                  <Input
                    placeholder="快递单号"
                    value={shipData.expressNo}
                    onChange={(e) => setShipData({ ...shipData, expressNo: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  关闭
                </Button>
                {selectedOrder.status === 'paid' && (
                  <Button onClick={() => handleShip(selectedOrder)} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    确认发货
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
