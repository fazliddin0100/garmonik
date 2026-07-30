"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";

export type NotificationItem = {
  id: number;
  message: string;
  time: string;
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    message: "Yangi bemor ro'yxatdan o'tdi",
    time: "Hozirgina",
    read: false,
  },
  {
    id: 2,
    message: "Shifokor jadvali yangilandi",
    time: "10 daqiqa oldin",
    read: false,
  },
  {
    id: 3,
    message: "Bugungi hisobot tayyor bo'ldi",
    time: "1 soat oldin",
    read: true,
  },
];

type NotificationDropdownProps = {
  items?: NotificationItem[];
};

export default function NotificationDropdown({
  items = initialNotifications,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(items);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  function markAllAsRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-xl border border-white/70 bg-white/80 p-2 text-slate-500 transition-colors hover:text-slate-900"
        aria-label="Bildirishnomalar">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Bildirishnomalar
            </h3>
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700">
              <CheckCheck className="h-3.5 w-3.5" />
              Barchasi o'qildi
            </button>
          </div>

          <div className="max-h-72 space-y-2 overflow-auto">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border px-3 py-2 ${
                  item.read
                    ? "border-slate-100 bg-slate-50/70"
                    : "border-violet-100 bg-violet-50/70"
                }`}>
                <p className="text-sm text-slate-700">{item.message}</p>
                <p className="mt-1 text-xs text-slate-500">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
