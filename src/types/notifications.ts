export type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  kind: "security" | "bill" | "budget" | "savings" | "payment" | "system";
  actionLabel?: string;
  actionHref?: string;
  progress?: number;
  dueDateISO?: string;
  isPaid?: boolean;
};
