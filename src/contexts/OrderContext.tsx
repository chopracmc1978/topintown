import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '@/types/menu';

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) => void;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = (orderData: Omit<Order, 'id' | 'createdAt'>) => {
    const orderNum = Date.now().toString().slice(-6);
    const newOrder: Order = {
      ...orderData,
      id: `#${orderNum}`,
      createdAt: new Date(),
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
  };

  const updatePaymentStatus = (orderId: string, paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) => {
    setOrders((prev) =>
      prev.map((order) => 
        order.id === orderId 
          ? { ...order, paymentStatus, paymentMethod: paymentMethod || order.paymentMethod } 
          : order
      )
    );
  };

  const getOrderById = (orderId: string) => {
    return orders.find((order) => order.id === orderId);
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, updatePaymentStatus, getOrderById }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
