import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BellRing } from "lucide-react";
import { useLocation } from "wouter";

export function NotificationIndicator({ compact = false }: { compact?: boolean }) {
  const notifications = trpc.notification.list.useQuery();
  const [, setLocation] = useLocation();
  const unread = notifications.data?.filter(notification => !notification.readAt).length ?? 0;
  return <Button variant="outline" size="sm" onClick={() => setLocation("/notifications")} className={compact ? "relative border-cyan-300/20" : "relative w-full justify-start border-cyan-300/20 text-slate-300"} aria-label={`${unread} unread notifications`}><BellRing className="h-4 w-4" />{!compact && <span className="ml-2">Notifications</span>}{unread > 0 && <Badge className="ml-auto border-0 bg-fuchsia-500 px-1.5 py-0 text-[10px] text-white">{unread > 99 ? "99+" : unread}</Badge>}</Button>;
}
