'use client';

import { useState, useEffect } from 'react';
import WebSocketService from '@/lib/websocket';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

export default function NotificationComponent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for new interactions (supervisor notifications)
    const handleInteractionsUpdated = (data: any[]) => {
      // In a real app, you would check if there are new interactions
      // For now, we'll just show a notification when data is updated
      if (data && data.length > 0) {
        const newNotification: Notification = {
          id: Date.now().toString(),
          title: 'New Interaction',
          message: 'A new customer interaction has been recorded',
          type: 'info',
          timestamp: new Date(),
        };
        
        setNotifications(prev => [newNotification, ...prev].slice(0, 5)); // Keep only last 5
        setVisible(true);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setVisible(false);
        }, 5000);
      }
    };

    WebSocketService.subscribe('interactionsUpdated', handleInteractionsUpdated);

    return () => {
      WebSocketService.unsubscribe('interactionsUpdated', handleInteractionsUpdated);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!visible || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg max-w-md ${
            notification.type === 'success' ? 'bg-green-100 border border-green-300' :
            notification.type === 'error' ? 'bg-red-100 border border-red-300' :
            notification.type === 'warning' ? 'bg-yellow-100 border border-yellow-300' :
            'bg-blue-100 border border-blue-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm mt-1">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}