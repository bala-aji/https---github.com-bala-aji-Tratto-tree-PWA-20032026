import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ChefHat,
  Flame,
  Clock,
  Check,
  CheckCheck,
  Bell,
  AlertTriangle,
  UtensilsCrossed,
  Package,
  Volume2,
  VolumeX,
  Users,
  CreditCard,
  Timer,
  PackageCheck,
  User,
  Plus,
  Armchair,
  Zap,
  TrendingUp,
  CircleAlert,
  ChevronRight,
  ListOrdered,
  LayoutList,
  X,
  ChevronDown,
} from "lucide-react";
import {
  type KitchenOrder,
  type KitchenStatus,
  type ParcelOrder,
  type ParcelStatus,
  type WaiterTable,
  getSharedKitchenOrders,
  saveSharedKitchenOrders,
  getSharedParcelOrders,
  saveSharedParcelOrders,
  getSharedTables,
  saveSharedTables,
  getLanguage,
} from "../../data";
import { T, type Lang } from "../../translations";
import { toast, Toaster } from "sonner";
import { WaiterOrderFlow } from "./WaiterOrderFlow";
import { UserBadge } from "../auth/UserBadge";

/* ========== SHARED HELPERS ========== */
const KITCHEN_STATUS_FLOW: KitchenStatus[] = [
  "New",
  "Preparing",
  "Ready",
  "Served",
];
const PARCEL_STATUS_FLOW: ParcelStatus[] = [
  "Received",
  "Packing",
  "Ready",
  "Picked Up",
];
const getElapsed = (d: Date | string | undefined | null) => {
  if (!d) return 0;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime())
    ? 0
    : Math.floor((Date.now() - dt.getTime()) / 60000);
};
const getTimeRemaining = (
  d: Date | string | undefined | null,
) => {
  if (!d) return 0;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime())
    ? 0
    : Math.ceil((dt.getTime() - Date.now()) / 60000);
};

type ManagerTab = "kitchen" | "waiters" | "parcel";

const TABLE_STATUS_COLORS: Record<
  string,
  {
    bg: string;
    border: string;
    dot: string;
    text: string;
    badge: string;
    icon: typeof Clock;
  }
> = {
  available: {
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-500",
    text: "text-green-700",
    badge: "bg-green-500",
    icon: Check,
  },
  occupied: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    text: "text-blue-700",
    badge: "bg-blue-500",
    icon: Users,
  },
  reserved: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-500",
    icon: Clock,
  },
  needs_attention: {
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    text: "text-red-700",
    badge: "bg-red-500",
    icon: AlertTriangle,
  },
};

const kitchenStatusCfg: Record<
  KitchenStatus,
  {
    bg: string;
    border: string;
    badge: string;
    icon: typeof Clock;
  }
> = {
  New: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-500",
    icon: Bell,
  },
  Preparing: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-500",
    icon: Flame,
  },
  Ready: {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-500",
    icon: Check,
  },
  Served: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: "bg-gray-400",
    icon: CheckCheck,
  },
};

/* ========== SOUND HELPERS ========== */
const audioCtxRef = { current: null as AudioContext | null };
function getAudioCtx() {
  if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
  return audioCtxRef.current;
}

/** Kitchen (dine-in) order: ascending chime C5→E5→G5 */
function playKitchenSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
  const o1 = ctx.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(523.25, now);
  o1.frequency.setValueAtTime(659.25, now + 0.15);
  o1.frequency.setValueAtTime(783.99, now + 0.3);
  o1.connect(gain);
  o1.start(now);
  o1.stop(now + 0.6);
}

/** Parcel order: three quick staccato beeps */
function playParcelSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.15;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}

export function KitchenManagerView() {
  const navigate = useNavigate();
  const [lang] = useState<Lang>(() => getLanguage() as Lang);
  const L = (key: string) => T(key, lang);
  const [activeTab, setActiveTab] =
    useState<ManagerTab>("kitchen");
  const [soundOn, setSoundOn] = useState(true);
  const [, setTick] = useState(0);

  // Track known order IDs for new-order sound detection
  const knownKitchenIdsRef = useRef<Set<string>>(new Set());
  const knownParcelIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Shared kitchen state (localStorage-backed)
  const [kitchenOrders, setKitchenOrders] = useState<
    KitchenOrder[]
  >(() => getSharedKitchenOrders());
  const [kitchenFilter, setKitchenFilter] = useState<
    KitchenStatus | "All"
  >("All");

  // Shared parcel state
  const [parcelOrders, setParcelOrders] = useState<
    ParcelOrder[]
  >(() => getSharedParcelOrders());

  // Shared table state
  const [tables, setTables] = useState<WaiterTable[]>(() =>
    getSharedTables(),
  );
  const [showOrderFlow, setShowOrderFlow] = useState(false);
  const [tableFilter, setTableFilter] = useState<
    WaiterTable["status"] | "All"
  >("All");
  const [tableViewMode, setTableViewMode] = useState<
    "tables" | "waiters"
  >("tables");
  const [trackerView, setTrackerView] = useState<
    "orders" | "items"
  >("items");
  const [selectedAggItem, setSelectedAggItem] = useState<
    string | null
  >(null);

  // Derive unique waiter names
  const waiterNames = useMemo(
    () => [...new Set(tables.map((t) => t.waiter))],
    [tables],
  );

  // Persist changes to localStorage
  useEffect(() => {
    saveSharedKitchenOrders(kitchenOrders);
  }, [kitchenOrders]);
  useEffect(() => {
    saveSharedParcelOrders(parcelOrders);
  }, [parcelOrders]);
  useEffect(() => {
    saveSharedTables(tables);
  }, [tables]);

  // Seed known IDs on first render (no sound for existing orders)
  useEffect(() => {
    knownKitchenIdsRef.current = new Set(kitchenOrders.map((o) => o.id));
    knownParcelIdsRef.current = new Set(parcelOrders.map((o) => o.id));
    // Mark initial load done after a short delay so first poll doesn't beep
    const t = setTimeout(() => { initialLoadRef.current = false; }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for external changes every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((p) => p + 1);
      const freshKitchen = getSharedKitchenOrders();
      const freshParcel = getSharedParcelOrders();
      const freshTables = getSharedTables();

      // Detect new kitchen orders & play sound
      if (!initialLoadRef.current && soundOn) {
        const newKitchen = freshKitchen.filter(
          (o) => !knownKitchenIdsRef.current.has(o.id),
        );
        const newParcel = freshParcel.filter(
          (o) => !knownParcelIdsRef.current.has(o.id),
        );
        if (newKitchen.length > 0) playKitchenSound();
        if (newParcel.length > 0) playParcelSound();
      }
      // Update known IDs
      knownKitchenIdsRef.current = new Set(freshKitchen.map((o) => o.id));
      knownParcelIdsRef.current = new Set(freshParcel.map((o) => o.id));

      setKitchenOrders((prev) => {
        const prevJson = JSON.stringify(prev.map((o) => o.id));
        const freshJson = JSON.stringify(
          freshKitchen.map((o) => o.id),
        );
        return prevJson !== freshJson ? freshKitchen : prev;
      });
      setParcelOrders((prev) => {
        const prevJson = JSON.stringify(prev.map((o) => o.id));
        const freshJson = JSON.stringify(
          freshParcel.map((o) => o.id),
        );
        return prevJson !== freshJson ? freshParcel : prev;
      });
      setTables((prev) => {
        const prevJson = JSON.stringify(
          prev.map((t) => `${t.id}-${t.status}`),
        );
        const freshJson = JSON.stringify(
          freshTables.map((t) => `${t.id}-${t.status}`),
        );
        return prevJson !== freshJson ? freshTables : prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [soundOn]);

  /* ----- Kitchen actions ----- */
  const advanceKitchenStatus = useCallback(
    (id: string) => {
      setKitchenOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const idx = KITCHEN_STATUS_FLOW.indexOf(o.status);
          if (idx >= KITCHEN_STATUS_FLOW.length - 1) return o;
          return { ...o, status: KITCHEN_STATUS_FLOW[idx + 1] };
        }),
      );
      toast.success(L("km.kitchen.updated"));
    },
    [lang],
  );

  const toggleItemDone = useCallback(
    (orderId: string, itemIdx: number) => {
      setKitchenOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const items = o.items.map((it, i) =>
            i === itemIdx ? { ...it, done: !it.done } : it,
          );
          // Auto-set to Preparing when first item is checked
          const newStatus =
            o.status === "New" && items.some((it) => it.done)
              ? ("Preparing" as KitchenStatus)
              : o.status;
          return { ...o, items, status: newStatus };
        }),
      );
    },
    [],
  );

  const markOrderDone = useCallback(
    (id: string) => {
      setKitchenOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          return { ...o, status: "Served" as KitchenStatus };
        }),
      );
      toast.success(L("km.kitchen.updated"));
    },
    [lang],
  );

  /* ----- Parcel actions ----- */
  const advanceParcelStatus = useCallback(
    (id: string) => {
      setParcelOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const idx = PARCEL_STATUS_FLOW.indexOf(o.status);
          if (idx >= PARCEL_STATUS_FLOW.length - 1) return o;
          return { ...o, status: PARCEL_STATUS_FLOW[idx + 1] };
        }),
      );
      toast.success(L("km.parcel.updated"));
    },
    [lang],
  );

  /* ----- Waiter/Table actions ----- */
  const clearAttention = useCallback(
    (tableId: number) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status:
                  t.guests > 0
                    ? ("occupied" as const)
                    : ("available" as const),
              }
            : t,
        ),
      );
      toast.success(
        `${L("table")} ${tableId} ${L("km.table.cleared")}`,
      );
    },
    [lang],
  );

  const handlePlaceOrder = useCallback(
    (order: {
      table: WaiterTable;
      waiter: string;
      guests: number;
      selectedSeats: number[];
      items: {
        menuItem: { id: string; name: string; price: number };
        quantity: number;
        seatNumbers: number[];
        notes: string;
      }[];
      kitchenOrder: Omit<KitchenOrder, "id">;
    }) => {
      // Create kitchen order
      const newKO: KitchenOrder = {
        ...order.kitchenOrder,
        id: `KO-${Date.now().toString().slice(-6)}`,
      };
      setKitchenOrders((prev) => [newKO, ...prev]);
      knownKitchenIdsRef.current.add(newKO.id);
      if (soundOn) playKitchenSound();

      // Update table status to occupied
      setTables((prev) =>
        prev.map((t) =>
          t.id === order.table.id
            ? {
                ...t,
                status: "occupied" as const,
                guests: order.guests,
                order_id: newKO.order_id,
                waiter: order.waiter,
              }
            : t,
        ),
      );

      setShowOrderFlow(false);
      toast.success(
        `Order placed for Table ${order.table.id}!`,
        {
          description: `${order.items.length} items · ₹${order.items.reduce((s, c) => s + c.menuItem.price * c.quantity, 0)} · Waiter: ${order.waiter}`,
        },
      );
    },
    [],
  );

  /* ----- Counts ----- */
  const kCounts = {
    New: kitchenOrders.filter((o) => o.status === "New").length,
    Preparing: kitchenOrders.filter(
      (o) => o.status === "Preparing",
    ).length,
    Ready: kitchenOrders.filter((o) => o.status === "Ready")
      .length,
  };
  const pCounts = {
    Received: parcelOrders.filter(
      (o) => o.status === "Received",
    ).length,
    Packing: parcelOrders.filter((o) => o.status === "Packing")
      .length,
    Ready: parcelOrders.filter((o) => o.status === "Ready")
      .length,
  };
  const needsAttention = tables.filter(
    (t) => t.status === "needs_attention",
  ).length;
  const occupiedTables = tables.filter(
    (t) => t.status === "occupied",
  ).length;

  const tCounts = {
    available: tables.filter((t) => t.status === "available")
      .length,
    occupied: occupiedTables,
    reserved: tables.filter((t) => t.status === "reserved")
      .length,
    needs_attention: needsAttention,
  };

  const filteredTables =
    tableFilter === "All"
      ? tables
      : tables.filter((t) => t.status === tableFilter);

  const filteredKitchen =
    kitchenFilter === "All"
      ? kitchenOrders.filter((o) => o.status !== "Served")
      : kitchenOrders.filter((o) => o.status === kitchenFilter);

  const activeParcel = parcelOrders.filter(
    (o) => o.status !== "Picked Up",
  );

  /* ----- Order Tracker: sorted list for right panel ----- */
  const OVERDUE_RUSH_MIN = 10;
  const OVERDUE_NORMAL_MIN = 20;
  const WARNING_BUFFER = 5;

  const allActiveOrders = kitchenOrders.filter(
    (o) => o.status !== "Served",
  );

  type TrackerUrgency = "overdue" | "warning" | "ontrack";
  interface TrackerItem {
    order: KitchenOrder;
    elapsed: number;
    urgency: TrackerUrgency;
    threshold: number;
    remaining: number;
  }

  const trackerItems: TrackerItem[] = allActiveOrders
    .map((order) => {
      const elapsed = getElapsed(order.created_at);
      const threshold =
        order.priority === "rush"
          ? OVERDUE_RUSH_MIN
          : OVERDUE_NORMAL_MIN;
      const remaining = threshold - elapsed;
      const urgency: TrackerUrgency =
        remaining <= 0
          ? "overdue"
          : remaining <= WARNING_BUFFER
            ? "warning"
            : "ontrack";
      return { order, elapsed, urgency, threshold, remaining };
    })
    .sort((a, b) => {
      const urgencyOrder: Record<TrackerUrgency, number> = {
        overdue: 0,
        warning: 1,
        ontrack: 2,
      };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency])
        return (
          urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
        );
      return b.elapsed - a.elapsed;
    });

  const overdueCount = trackerItems.filter(
    (t) => t.urgency === "overdue",
  ).length;
  const warningCount = trackerItems.filter(
    (t) => t.urgency === "warning",
  ).length;

  /* ----- Aggregated Items view for tracker ----- */
  interface AggregatedItem {
    name: string;
    totalQty: number;
    doneQty: number;
    pendingQty: number;
    orders: {
      orderId: string;
      orderLabel: string;
      qty: number;
      done: boolean;
      urgency: "overdue" | "warning" | "ontrack";
      elapsed: number;
      status: KitchenStatus;
      table?: number;
    }[];
    worstUrgency: "overdue" | "warning" | "ontrack";
  }

  const aggregatedItems = useMemo(() => {
    const map = new Map<string, AggregatedItem>();
    for (const ti of trackerItems) {
      for (const item of ti.order.items) {
        const key = item.name;
        if (!map.has(key)) {
          map.set(key, {
            name: key,
            totalQty: 0,
            doneQty: 0,
            pendingQty: 0,
            orders: [],
            worstUrgency: "ontrack",
          });
        }
        const agg = map.get(key)!;
        agg.totalQty += item.quantity;
        if (item.done) agg.doneQty += item.quantity;
        else agg.pendingQty += item.quantity;
        agg.orders.push({
          orderId: ti.order.id,
          orderLabel: ti.order.order_id,
          qty: item.quantity,
          done: item.done,
          urgency: ti.urgency,
          elapsed: ti.elapsed,
          status: ti.order.status,
          table: ti.order.table_number,
        });
        const urgencyRank = {
          overdue: 0,
          warning: 1,
          ontrack: 2,
        };
        if (
          urgencyRank[ti.urgency] <
          urgencyRank[agg.worstUrgency]
        )
          agg.worstUrgency = ti.urgency;
      }
    }
    return [...map.values()].sort((a, b) => {
      const urgencyRank = {
        overdue: 0,
        warning: 1,
        ontrack: 2,
      };
      if (
        urgencyRank[a.worstUrgency] !==
        urgencyRank[b.worstUrgency]
      )
        return (
          urgencyRank[a.worstUrgency] -
          urgencyRank[b.worstUrgency]
        );
      return b.pendingQty - a.pendingQty;
    });
  }, [trackerItems]);

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      <Toaster position="top-center" richColors />

      {/* ===== Header ===== */}
      <div className="bg-white border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[0.95rem] text-foreground">
                {L("km.title")}
              </h1>
              <p className="text-[0.62rem] text-muted-foreground">
                {L("app.title")} · {L("km.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div className="hidden md:flex items-center gap-2">
          {kCounts.New > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-[0.68rem]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              {kCounts.New} {L("km.new.orders")}
            </span>
          )}
          {pCounts.Ready > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-xl text-[0.68rem]">
              <PackageCheck className="w-3.5 h-3.5" />{" "}
              {pCounts.Ready} {L("km.parcels.ready")}
            </span>
          )}
          {needsAttention > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[0.68rem]">
              <AlertTriangle className="w-3.5 h-3.5" />{" "}
              {needsAttention} {L("km.tables.need.help")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <div className="text-[0.68rem] text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
            {new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <UserBadge compact />
        </div>
      </div>

      {/* ===== Tab bar ===== */}
      <div className="bg-white border-b border-border px-4 lg:px-6 py-2 flex gap-1 shrink-0">
        {[
          {
            id: "kitchen" as ManagerTab,
            label: L("km.kitchen.orders"),
            icon: Flame,
            count: kCounts.New + kCounts.Preparing,
            color: "text-amber-600",
          },
          {
            id: "waiters" as ManagerTab,
            label: L("km.tables.waiters"),
            icon: Users,
            count: needsAttention,
            color: "text-blue-600",
          },
          {
            id: "parcel" as ManagerTab,
            label: L("km.parcel.queue"),
            icon: Package,
            count: pCounts.Received + pCounts.Packing,
            color: "text-purple-600",
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.82rem] transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.58rem] ${
                  activeTab === tab.id
                    ? "bg-white/20"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <AnimatePresence mode="wait">
          {/* ========== KITCHEN TAB ========== */}
          {activeTab === "kitchen" && (
            <motion.div
              key="kitchen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Filter pills */}

              {/* Two-column layout: Order cards (left) + Tracker panel (right) */}
              <div className="flex gap-4 items-start">
                {/* LEFT — Order cards grid */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <AnimatePresence mode="popLayout">
                      {filteredKitchen.map((order) => {
                        const elapsed = getElapsed(
                          order.created_at,
                        );
                        const cfg =
                          kitchenStatusCfg[order.status];
                        const StatusIcon = cfg.icon;
                        const doneCount = order.items.filter(
                          (i) => i.done,
                        ).length;
                        const totalItems = order.items.length;
                        const progress =
                          totalItems > 0
                            ? (doneCount / totalItems) * 100
                            : 0;

                        return (
                          <motion.div
                            key={order.id}
                            layout
                            initial={{
                              opacity: 0,
                              scale: 0.95,
                            }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`rounded-[12px] border border-[#ededed] bg-white overflow-hidden ${order.priority === "rush" ? "ring-2 ring-red-400/50" : ""}`}
                          >
                            {/* Header */}
                            <div className="px-[14px] py-[10px] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-[6px] ${cfg.badge} flex items-center justify-center`}
                                >
                                  <StatusIcon className="w-3 h-3 text-white" />
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[12.48px] leading-[18.72px] font-bold text-[#2e3a59]">
                                      {order.order_id}
                                    </span>
                                    {order.priority ===
                                      "rush" && (
                                      <span className="px-1 py-0.5 bg-[#ffe2e2] text-[#e7000b] rounded-[4px] text-[11px] leading-[12px] font-medium flex items-center gap-0.5">
                                        <Flame className="w-2 h-2" />
                                        RUSH
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] leading-[14.4px] text-[#64748b]">
                                    {order.customer_name} ·{" "}
                                    {order.waiter}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`text-[11px] leading-[16.32px] px-2.5 py-[3px] rounded-[10px] border flex items-center gap-1 ${elapsed >= 20 ? "bg-[#fef2f2] border-[#ffc9c9] text-[#e7000b]" : elapsed >= 10 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-green-50 border-green-200 text-green-600"}`}
                              >
                                <Clock className="w-3 h-3" />
                                {elapsed}m
                              </div>
                            </div>

                            {/* Type badges */}
                            <div className="flex items-center gap-1.5 px-[14px] pt-[0px] pb-[4px]">
                              <span
                                className={`text-[11px] leading-[13.92px] font-semibold px-1.5 py-[2px] rounded-full ${order.order_type === "Take Away" ? "bg-purple-100 text-purple-600" : "bg-[#dbeafe] text-[#155dfc]"}`}
                              >
                                {order.order_type === "Dine In"
                                  ? "Dine In"
                                  : order.order_type}
                              </span>
                              {order.table_number && (
                                <span className="text-[11px] leading-[13.92px] font-semibold bg-[#f3f4f6] text-[#4a5565] px-1.5 py-[2px] rounded-full">
                                  Table {order.table_number}
                                </span>
                              )}
                            </div>

                            {/* Items — single bordered container with dividers */}
                            <div className="px-[8px] pt-[10px] pb-[16px]">
                              <div className="bg-[rgba(255,255,255,0.7)] rounded-[6px] border border-[#e5e7eb] overflow-hidden">
                                {order.items.map((item, idx) => (
                                  <button
                                    key={`${order.id}-${idx}`}
                                    onClick={() =>
                                      toggleItemDone(
                                        order.id,
                                        idx,
                                      )
                                    }
                                    className={`w-full flex items-center gap-2 text-left transition-all cursor-pointer hover:bg-gray-50/50 ${idx > 0 ? "border-t border-[#ededed]" : ""} px-[12px] py-[10px]`}
                                  >
                                    <span
                                      className={`w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 ${item.done ? "bg-[#00c950]" : "bg-white border-[2.5px] border-[#d1d5dc]"}`}
                                    >
                                      {item.done && (
                                        <Check className="w-[10px] h-[10px] text-white" strokeWidth={1.5} />
                                      )}
                                    </span>
                                    <span
                                      className={`flex-1 text-[13px] leading-[17.28px] font-semibold ${item.done ? "line-through text-[#94a3b8]" : "text-[#2e3a59]"}`}
                                    >
                                      {item.name}
                                    </span>
                                    <span
                                      className={`text-[13px] leading-[16.32px] font-semibold ${item.done ? "line-through text-[#94a3b8]" : "text-[#ff6b35]"}`}
                                    >
                                      x{item.quantity}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Action — "Done" only when all items checked */}
                            {order.status !== "Served" &&
                              (() => {
                                const allChecked =
                                  order.items.length > 0 &&
                                  order.items.every(
                                    (it) => it.done,
                                  );
                                const checkedCount =
                                  order.items.filter(
                                    (it) => it.done,
                                  ).length;
                                return (
                                  <div className="px-[14px] pb-[14px]">
                                    {allChecked ? (
                                      <motion.button
                                        initial={{
                                          scale: 0.95,
                                          opacity: 0,
                                        }}
                                        animate={{
                                          scale: 1,
                                          opacity: 1,
                                        }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 20,
                                        }}
                                        onClick={() =>
                                          markOrderDone(
                                            order.id,
                                          )
                                        }
                                        className="w-full py-2.5 rounded-[6px] text-[13px] text-white cursor-pointer hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 bg-[var(--primary)] text-[var(--primary-foreground)]"
                                      >
                                        <CheckCheck className="w-4 h-4" />{" "}
                                        Done
                                      </motion.button>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                                          <motion.div
                                            className="h-full bg-[#ff6b35] rounded-full"
                                            animate={{
                                              width: `${order.items.length > 0 ? (checkedCount / order.items.length) * 100 : 0}%`,
                                            }}
                                            transition={{
                                              type: "spring",
                                              stiffness: 400,
                                              damping: 20,
                                            }}
                                          />
                                        </div>
                                        <span className="text-[9.6px] leading-[14.4px] text-[#94a3b8] shrink-0 text-[11px]">
                                          {checkedCount}/
                                          {order.items.length}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {filteredKitchen.length === 0 && (
                    <div className="text-center py-16">
                      <ChefHat className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
                      <p className="text-muted-foreground text-[0.82rem]">
                        {L("km.no.orders")}
                      </p>
                    </div>
                  )}
                </div>

                {/* RIGHT — Order Tracker Panel (hidden on small screens) */}
                <div className="hidden lg:block w-[320px] xl:w-[340px] shrink-0 sticky top-0 self-start">
                  <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
                    {/* Tracker header */}
                    <div className="border-b border-border bg-gradient-to-r from-[#fff8f5] to-white px-[16px] pt-[16px] pb-[12px]">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-[0.82rem] text-foreground text-[14px] font-bold">
                              Order Tracker
                            </h3>
                            <p className="text-[0.55rem] text-muted-foreground text-[11px]">
                              {allActiveOrders.length} orders ·{" "}
                              {aggregatedItems.reduce(
                                (s, a) => s + a.pendingQty,
                                0,
                              )}{" "}
                              items pending
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* View toggle — segmented control */}
                      <div className="flex gap-1 bg-muted rounded-lg p-1">
                        {[
                          {
                            id: "items" as const,
                            label: "By Item",
                            icon: LayoutList,
                          },
                          {
                            id: "orders" as const,
                            label: "By Order",
                            icon: ListOrdered,
                          },
                        ].map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setTrackerView(v.id)}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[0.68rem] transition-all cursor-pointer ${
                              trackerView === v.id
                                ? "bg-white shadow-sm text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            <v.icon className="w-3 h-3" />
                            {v.label}
                          </button>
                        ))}
                      </div>

                      {/* Urgency summary pills */}
                      {(overdueCount > 0 ||
                        warningCount > 0) && (
                        <div className="flex gap-1.5 mt-2.5">
                          {overdueCount > 0 && (
                            <motion.span
                              initial={{ scale: 0.9 }}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{
                                repeat: Infinity,
                                duration: 2,
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 border border-red-300 text-red-700 rounded-lg text-[0.62rem]"
                            >
                              <CircleAlert className="w-3 h-3" />{" "}
                              {overdueCount} Overdue
                            </motion.span>
                          )}
                          {warningCount > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-300 text-amber-700 rounded-lg text-[0.62rem]">
                              <AlertTriangle className="w-3 h-3" />{" "}
                              {warningCount} Warning
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tracker content */}
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                      {trackerItems.length === 0 && (
                        <div className="py-10 text-center">
                          <Check className="w-8 h-8 text-green-300 mx-auto mb-2" />
                          <p className="text-[0.75rem] text-muted-foreground">
                            All clear!
                          </p>
                        </div>
                      )}

                      {/* ===== BY ITEM VIEW — compact merged list ===== */}
                      {trackerView === "items" &&
                        trackerItems.length > 0 && (
                          <AnimatePresence mode="popLayout">
                            {aggregatedItems.map((agg) => {
                              const urgencyBorder =
                                agg.worstUrgency === "overdue"
                                  ? "border-l-4 border-l-red-500"
                                  : agg.worstUrgency ===
                                      "warning"
                                    ? "border-l-4 border-l-amber-500"
                                    : "border-l-4 border-l-green-500";
                              const allDone =
                                agg.pendingQty === 0;

                              return (
                                <motion.div
                                  key={agg.name}
                                  layout
                                  initial={{
                                    opacity: 0,
                                    x: 20,
                                  }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 20,
                                  }}
                                  onClick={() =>
                                    setSelectedAggItem(agg.name)
                                  }
                                  className={`px-3.5 py-2.5 border-b border-border/50 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors ${urgencyBorder} ${allDone ? "bg-green-50/30" : "bg-white"}`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    {/* Quantity badge */}
                                    <div
                                      className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                                        allDone
                                          ? "bg-green-100"
                                          : agg.worstUrgency ===
                                              "overdue"
                                            ? "bg-red-100"
                                            : "bg-[#fff3ed]"
                                      }`}
                                    >
                                      <span
                                        className={`text-[1rem] ${allDone ? "text-green-600" : agg.worstUrgency === "overdue" ? "text-red-600" : "text-[#ff6b35]"}`}
                                      >
                                        {allDone ? (
                                          <Check className="w-4 h-4" />
                                        ) : (
                                          agg.pendingQty
                                        )}
                                      </span>
                                    </div>

                                    {/* Name + meta */}
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-[0.78rem] text-[#2e3a59] truncate ${allDone ? "line-through text-[#94a3b8]" : ""} text-[13px] font-bold`}
                                      >
                                        {agg.name}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[0.55rem] text-[#94a3b8] text-[12px]">
                                          {agg.orders.length}{" "}
                                          order
                                          {agg.orders.length > 1
                                            ? "s"
                                            : ""}
                                        </span>
                                        {agg.doneQty > 0 && (
                                          <span className="text-[0.55rem] text-green-600 text-[12px]">
                                            {agg.doneQty} done
                                          </span>
                                        )}
                                        {agg.worstUrgency ===
                                          "overdue" &&
                                          !allDone && (
                                            <span className="flex items-center gap-0.5 text-[0.55rem] text-red-600 text-[10px]">
                                              <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                                              </span>
                                              overdue
                                            </span>
                                          )}
                                      </div>
                                    </div>

                                    {/* Chevron */}
                                    <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] shrink-0 -rotate-90" />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        )}

                      {/* ===== BY ORDER VIEW ===== */}
                      {trackerView === "orders" &&
                        trackerItems.length > 0 && (
                          <AnimatePresence mode="popLayout">
                            {trackerItems.map((item) => {
                              const {
                                order,
                                elapsed,
                                urgency,
                                threshold,
                                remaining,
                              } = item;
                              const cfg =
                                kitchenStatusCfg[order.status];
                              const StatusIcon = cfg.icon;
                              const doneCount =
                                order.items.filter(
                                  (i) => i.done,
                                ).length;
                              const totalItems =
                                order.items.length;
                              const timeProgress = Math.min(
                                100,
                                (elapsed / threshold) * 100,
                              );

                              const urgencyStyles: Record<
                                string,
                                string
                              > = {
                                overdue:
                                  "border-l-4 border-l-red-500 bg-red-50/50",
                                warning:
                                  "border-l-4 border-l-amber-500 bg-amber-50/30",
                                ontrack:
                                  "border-l-4 border-l-green-500 bg-white",
                              };

                              return (
                                <motion.div
                                  key={order.id}
                                  layout
                                  initial={{
                                    opacity: 0,
                                    x: 20,
                                  }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 20,
                                  }}
                                  className={`px-3.5 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors ${urgencyStyles[urgency]}`}
                                >
                                  {/* Row 1: Order info + time badge */}
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`w-5 h-5 rounded-md ${cfg.badge} flex items-center justify-center shrink-0`}
                                      >
                                        <StatusIcon className="w-2.5 h-2.5 text-white" />
                                      </span>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[0.72rem] text-[#2e3a59] truncate">
                                            {order.order_id}
                                          </span>
                                          {order.priority ===
                                            "rush" && (
                                            <Zap className="w-3 h-3 text-red-500 shrink-0" />
                                          )}
                                        </div>
                                        <p className="text-[0.55rem] text-[#94a3b8] truncate">
                                          {order.customer_name}
                                          {order.table_number
                                            ? ` · T${order.table_number}`
                                            : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <div
                                      className={`text-[0.65rem] px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-0.5 ${
                                        urgency === "overdue"
                                          ? "bg-red-100 text-red-700 border border-red-200"
                                          : urgency ===
                                              "warning"
                                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                                            : "bg-green-100 text-green-700 border border-green-200"
                                      }`}
                                    >
                                      <Clock className="w-2.5 h-2.5" />
                                      {urgency === "overdue" ? (
                                        <span>
                                          {Math.abs(remaining)}m
                                          over
                                        </span>
                                      ) : (
                                        <span>
                                          {remaining}m left
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Row 2: Time progress bar */}
                                  <div className="mb-1.5">
                                    <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                      <motion.div
                                        className={`h-full rounded-full ${
                                          urgency === "overdue"
                                            ? "bg-red-500"
                                            : urgency ===
                                                "warning"
                                              ? "bg-amber-500"
                                              : "bg-green-500"
                                        }`}
                                        animate={{
                                          width: `${Math.min(timeProgress, 100)}%`,
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <span className="text-[0.5rem] text-[#94a3b8]">
                                        {elapsed}m elapsed
                                      </span>
                                      <span className="text-[0.5rem] text-[#94a3b8]">
                                        {doneCount}/{totalItems}{" "}
                                        items
                                      </span>
                                    </div>
                                  </div>

                                  {/* Row 3: Items list */}
                                  <div className="space-y-0.5 mb-1.5">
                                    {order.items.map(
                                      (it, i) => (
                                        <div
                                          key={`${order.id}-tr-${i}`}
                                          className={`flex items-center gap-1.5 text-[0.6rem] ${it.done ? "text-[#94a3b8] line-through" : "text-[#2e3a59]"}`}
                                        >
                                          <span
                                            className={`w-2.5 h-2.5 rounded-sm shrink-0 ${it.done ? "bg-green-500" : "bg-gray-300"}`}
                                          />
                                          <span className="flex-1 truncate">
                                            {it.name}
                                          </span>
                                          <span
                                            className={`${it.done ? "text-[#94a3b8]" : "text-[#ff6b35]"}`}
                                          >
                                            ×{it.quantity}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>

                                  {/* Row 4: Status + quick action */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`text-[0.55rem] px-1.5 py-0.5 rounded-full ${
                                          order.status === "New"
                                            ? "bg-blue-100 text-blue-600"
                                            : order.status ===
                                                "Preparing"
                                              ? "bg-amber-100 text-amber-600"
                                              : "bg-green-100 text-green-600"
                                        }`}
                                      >
                                        {order.status}
                                      </span>
                                      <span
                                        className={`text-[0.55rem] px-1.5 py-0.5 rounded-full ${order.order_type === "Take Away" ? "bg-purple-100 text-purple-600" : "bg-blue-50 text-blue-500"}`}
                                      >
                                        {order.order_type ===
                                        "Take Away"
                                          ? "Parcel"
                                          : "Dine"}
                                      </span>
                                    </div>
                                    {order.items.length > 0 &&
                                    order.items.every(
                                      (it) => it.done,
                                    ) ? (
                                      <button
                                        onClick={() =>
                                          markOrderDone(
                                            order.id,
                                          )
                                        }
                                        className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[0.55rem] text-white cursor-pointer hover:brightness-110 transition-all bg-green-500"
                                      >
                                        <CheckCheck className="w-2.5 h-2.5" />{" "}
                                        Done
                                      </button>
                                    ) : (
                                      <span className="text-[0.55rem] text-[#94a3b8]">
                                        {
                                          order.items.filter(
                                            (it) => it.done,
                                          ).length
                                        }
                                        /{order.items.length}
                                      </span>
                                    )}
                                  </div>

                                  {/* Overdue alert banner */}
                                  {urgency === "overdue" && (
                                    <motion.div
                                      initial={{
                                        height: 0,
                                        opacity: 0,
                                      }}
                                      animate={{
                                        height: "auto",
                                        opacity: 1,
                                      }}
                                      className="mt-1.5 px-2 py-1.5 bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5"
                                    >
                                      <span className="relative flex h-2 w-2 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                      </span>
                                      <span className="text-[0.55rem] text-red-700">
                                        Overdue by{" "}
                                        {Math.abs(remaining)}m —{" "}
                                        {order.priority ===
                                        "rush"
                                          ? "RUSH ORDER"
                                          : "needs attention"}
                                        !
                                      </span>
                                    </motion.div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        )}
                    </div>

                    {/* Tracker footer — stats */}
                    <div className="px-4 py-2.5 border-t border-border bg-[#f8f9fb] flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[0.58rem]">
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="w-3 h-3" />{" "}
                          {
                            trackerItems.filter(
                              (t) => t.urgency === "ontrack",
                            ).length
                          }{" "}
                          On Track
                        </span>
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="w-3 h-3" />{" "}
                          {warningCount} Warn
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <CircleAlert className="w-3 h-3" />{" "}
                          {overdueCount} Late
                        </span>
                      </div>
                      <span className="text-[0.55rem] text-muted-foreground">
                        Avg:{" "}
                        {allActiveOrders.length > 0
                          ? Math.round(
                              allActiveOrders.reduce(
                                (s, o) =>
                                  s + getElapsed(o.created_at),
                                0,
                              ) / allActiveOrders.length,
                            )
                          : 0}
                        m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========== WAITERS & TABLES TAB ========== */}
          {activeTab === "waiters" && (
            <motion.div
              key="waiters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Top bar: View toggle + New Order */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                {/* View mode toggle — matches CashierPOS segmented control */}
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {[
                    {
                      id: "tables" as const,
                      label: L("km.by.table"),
                      icon: UtensilsCrossed,
                    },
                    {
                      id: "waiters" as const,
                      label: L("km.by.waiter"),
                      icon: User,
                    },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setTableViewMode(v.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.75rem] transition-all cursor-pointer ${
                        tableViewMode === v.id
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <v.icon className="w-3.5 h-3.5" />
                      {v.label}
                    </button>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowOrderFlow(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-[0.78rem] cursor-pointer shadow-md shadow-orange-200 hover:shadow-lg transition-shadow"
                >
                  <Plus className="w-4 h-4" />{" "}
                  {L("km.new.order")}
                </motion.button>
              </div>

              {/* Filter pills — matches kitchen filter pills exactly */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {[
                  { id: "All" as const, label: "All" },
                  {
                    id: "occupied" as const,
                    label: "Occupied",
                  },
                  {
                    id: "available" as const,
                    label: "Available",
                  },
                  {
                    id: "reserved" as const,
                    label: "Reserved",
                  },
                  {
                    id: "needs_attention" as const,
                    label: "Needs Help",
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTableFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-[0.75rem] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      tableFilter === f.id
                        ? "bg-foreground text-white"
                        : "bg-white border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                    {f.id !== "All" &&
                      (tCounts as any)[f.id] > 0 && (
                        <span
                          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[0.55rem] ${
                            tableFilter === f.id
                              ? "bg-white/20"
                              : "bg-foreground/10"
                          }`}
                        >
                          {(tCounts as any)[f.id]}
                        </span>
                      )}
                  </button>
                ))}
              </div>

              {/* ===== BY TABLE VIEW — kitchen-order card style ===== */}
              {tableViewMode === "tables" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <AnimatePresence mode="popLayout">
                      {filteredTables.map((table) => {
                        const cfg =
                          TABLE_STATUS_COLORS[table.status];
                        const StatusIcon = cfg.icon;
                        const order = table.order_id
                          ? kitchenOrders.find(
                              (o) =>
                                o.order_id === table.order_id,
                            )
                          : undefined;
                        const elapsed = order
                          ? getElapsed(order.created_at)
                          : 0;
                        const doneCount = order
                          ? order.items.filter((i) => i.done)
                              .length
                          : 0;
                        const totalItems = order
                          ? order.items.length
                          : 0;
                        const progress =
                          totalItems > 0
                            ? (doneCount / totalItems) * 100
                            : 0;
                        const orderCfg = order
                          ? kitchenStatusCfg[order.status]
                          : null;

                        return (
                          <motion.div
                            key={table.id}
                            layout
                            initial={{
                              opacity: 0,
                              scale: 0.95,
                            }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`rounded-2xl border overflow-hidden ${cfg.bg} ${cfg.border} ${table.status === "needs_attention" ? "ring-2 ring-red-400/50" : ""}`}
                          >
                            {/* Header — matches kitchen card header */}
                            <div className="px-3.5 py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-lg ${cfg.badge} flex items-center justify-center`}
                                >
                                  <StatusIcon className="w-3 h-3 text-white" />
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[0.78rem] text-[#2e3a59]">
                                      Table {table.id}
                                    </span>
                                    {table.status ===
                                      "needs_attention" && (
                                      <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-[0.5rem] flex items-center gap-0.5">
                                        <AlertTriangle className="w-2 h-2" />
                                        HELP
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[0.6rem] text-[#64748b]">
                                    {table.waiter} ·{" "}
                                    {table.seats} seats
                                  </p>
                                </div>
                              </div>
                              {order ? (
                                <div
                                  className={`text-[0.68rem] px-2 py-0.5 rounded-lg border ${elapsed >= 20 ? "bg-red-50 border-red-200 text-red-600" : elapsed >= 10 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-green-50 border-green-200 text-green-600"}`}
                                >
                                  <Clock className="w-3 h-3 inline mr-0.5" />
                                  {elapsed}m
                                </div>
                              ) : (
                                <span
                                  className={`text-[0.58rem] px-1.5 py-0.5 rounded-full text-white ${cfg.badge}`}
                                >
                                  {table.status ===
                                  "needs_attention"
                                    ? "Alert"
                                    : table.status
                                        .charAt(0)
                                        .toUpperCase() +
                                      table.status.slice(1)}
                                </span>
                              )}
                            </div>

                            {/* Info badges — matches kitchen type badges */}
                            <div className="px-3.5 pb-1.5 flex items-center gap-1.5">
                              <span className="text-[0.58rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" />{" "}
                                {table.guests}/{table.seats}
                              </span>
                              <span className="text-[0.58rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-0.5">
                                <Armchair className="w-2.5 h-2.5" />{" "}
                                {table.seats}-seater
                              </span>
                              {order && (
                                <span
                                  className={`text-[0.58rem] px-1.5 py-0.5 rounded-full ${order.order_type === "Take Away" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}
                                >
                                  {order.order_type}
                                </span>
                              )}
                            </div>

                            {/* Progress — only for tables with orders */}
                            {order && null}

                            {/* Items — matches kitchen items with checkboxes */}
                            {order && (
                              <div className="px-3.5 pb-2.5 space-y-1">
                                {order.items.map(
                                  (item, idx) => (
                                    <button
                                      key={`t${table.id}-${idx}`}
                                      onClick={() =>
                                        toggleItemDone(
                                          order.id,
                                          idx,
                                        )
                                      }
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                                        item.done
                                          ? "bg-green-100/50 border border-green-200"
                                          : "bg-white/70 border border-gray-200 hover:border-orange-300"
                                      }`}
                                    >
                                      <span
                                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${item.done ? "bg-green-500" : "bg-white border-2 border-gray-300"}`}
                                      >
                                        {item.done && (
                                          <Check className="w-2.5 h-2.5 text-white" />
                                        )}
                                      </span>
                                      <span
                                        className={`flex-1 text-[0.72rem] ${item.done ? "line-through text-[#94a3b8]" : "text-[#2e3a59]"}`}
                                      >
                                        {item.name}
                                      </span>
                                      <span
                                        className={`text-[0.68rem] ${item.done ? "text-[#94a3b8]" : "text-[#ff6b35]"}`}
                                      >
                                        x{item.quantity}
                                      </span>
                                    </button>
                                  ),
                                )}
                              </div>
                            )}

                            {/* Empty state for available tables */}
                            {!order &&
                              table.status === "available" && (
                                <div className="px-3.5 pb-2.5">
                                  <div className="flex items-center justify-center py-3 bg-white/50 rounded-lg border border-dashed border-green-300">
                                    <p className="text-[0.65rem] text-green-600 flex items-center gap-1">
                                      <Check className="w-3 h-3" />{" "}
                                      {L("km.ready.guests")}
                                    </p>
                                  </div>
                                </div>
                              )}

                            {/* Reserved info */}
                            {!order &&
                              table.status === "reserved" && (
                                <div className="px-3.5 pb-2.5">
                                  <div className="flex items-center justify-center py-3 bg-white/50 rounded-lg border border-dashed border-amber-300">
                                    <p className="text-[0.65rem] text-amber-600 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />{" "}
                                      {L("km.awaiting.guests")}
                                    </p>
                                  </div>
                                </div>
                              )}

                            {/* Actions — matches kitchen action buttons */}
                            <div className="px-3.5 pb-3.5">
                              {table.status ===
                                "needs_attention" && (
                                <button
                                  onClick={() =>
                                    clearAttention(table.id)
                                  }
                                  className="w-full py-2 rounded-xl text-[0.75rem] text-white cursor-pointer hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 bg-green-500"
                                >
                                  <Check className="w-3.5 h-3.5" />{" "}
                                  {L("km.resolve")}
                                </button>
                              )}
                              {order &&
                                order.status !== "Served" &&
                                (() => {
                                  const allChecked =
                                    order.items.length > 0 &&
                                    order.items.every(
                                      (it) => it.done,
                                    );
                                  const checkedCount =
                                    order.items.filter(
                                      (it) => it.done,
                                    ).length;
                                  return allChecked ? (
                                    <motion.button
                                      initial={{
                                        scale: 0.95,
                                        opacity: 0,
                                      }}
                                      animate={{
                                        scale: 1,
                                        opacity: 1,
                                      }}
                                      transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 20,
                                      }}
                                      onClick={() =>
                                        markOrderDone(order.id)
                                      }
                                      className="w-full py-2 rounded-xl text-[0.75rem] text-white cursor-pointer hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 bg-green-500"
                                    >
                                      <CheckCheck className="w-3.5 h-3.5" />{" "}
                                      Done
                                    </motion.button>
                                  ) : (
                                    <div className="flex items-center gap-2 py-1">
                                      <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                                        <motion.div
                                          className="h-full bg-[#ff6b35] rounded-full"
                                          animate={{
                                            width: `${order.items.length > 0 ? (checkedCount / order.items.length) * 100 : 0}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-[0.6rem] text-[#94a3b8]">
                                        {checkedCount}/
                                        {order.items.length}{" "}
                                        checked
                                      </span>
                                    </div>
                                  );
                                })()}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {filteredTables.length === 0 && (
                    <div className="text-center py-16">
                      <UtensilsCrossed className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
                      <p className="text-muted-foreground text-[0.82rem]">
                        {L("km.no.tables")}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ===== BY WAITER VIEW — kitchen-order card style per waiter ===== */}
              {tableViewMode === "waiters" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <AnimatePresence mode="popLayout">
                      {waiterNames.map((waiterName) => {
                        const wTables = tables.filter(
                          (t) => t.waiter === waiterName,
                        );
                        const wFilteredTables =
                          tableFilter === "All"
                            ? wTables
                            : wTables.filter(
                                (t) => t.status === tableFilter,
                              );
                        const wActiveOrders =
                          kitchenOrders.filter(
                            (o) =>
                              o.waiter === waiterName &&
                              o.status !== "Served",
                          );
                        const wOccupied = wTables.filter(
                          (t) => t.status === "occupied",
                        ).length;
                        const wAvail = wTables.filter(
                          (t) => t.status === "available",
                        ).length;
                        const wAlert = wTables.filter(
                          (t) => t.status === "needs_attention",
                        ).length;
                        const workload =
                          wTables.length > 0
                            ? (wOccupied / wTables.length) * 100
                            : 0;

                        const waiterBg =
                          wAlert > 0
                            ? "bg-red-50"
                            : workload > 75
                              ? "bg-amber-50"
                              : "bg-blue-50";
                        const waiterBorder =
                          wAlert > 0
                            ? "border-red-200"
                            : workload > 75
                              ? "border-amber-200"
                              : "border-blue-200";
                        const waiterBadge =
                          wAlert > 0
                            ? "bg-red-500"
                            : workload > 75
                              ? "bg-amber-500"
                              : "bg-blue-500";

                        return (
                          <motion.div
                            key={waiterName}
                            layout
                            initial={{
                              opacity: 0,
                              scale: 0.95,
                            }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`rounded-2xl border overflow-hidden ${waiterBg} ${waiterBorder} ${wAlert > 0 ? "ring-2 ring-red-400/50" : ""}`}
                          >
                            {/* Header — waiter info */}
                            <div className="px-3.5 py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-lg ${waiterBadge} flex items-center justify-center`}
                                >
                                  <User className="w-3 h-3 text-white" />
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[0.78rem] text-[#2e3a59]">
                                      {waiterName}
                                    </span>
                                    {wAlert > 0 && (
                                      <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-[0.5rem] flex items-center gap-0.5">
                                        <AlertTriangle className="w-2 h-2" />
                                        {wAlert} ALERT
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[0.6rem] text-[#64748b]">
                                    {wTables.length} tables ·{" "}
                                    {wActiveOrders.length}{" "}
                                    active orders
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`text-[0.68rem] px-2 py-0.5 rounded-lg border ${workload >= 75 ? "bg-red-50 border-red-200 text-red-600" : workload >= 50 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-green-50 border-green-200 text-green-600"}`}
                              >
                                {Math.round(workload)}% load
                              </div>
                            </div>

                            {/* Stat badges */}
                            <div className="px-3.5 pb-1.5 flex items-center gap-1.5">
                              <span className="text-[0.58rem] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" />{" "}
                                {wOccupied} busy
                              </span>
                              <span className="text-[0.58rem] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />{" "}
                                {wAvail} free
                              </span>
                              {wActiveOrders.length > 0 && (
                                <span className="text-[0.58rem] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" />{" "}
                                  {wActiveOrders.length} cooking
                                </span>
                              )}
                            </div>

                            {/* Workload progress */}
                            <div className="px-3.5 pb-1.5">
                              <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${workload >= 75 ? "bg-red-500" : workload >= 50 ? "bg-amber-500" : "bg-green-500"}`}
                                  animate={{
                                    width: `${workload}%`,
                                  }}
                                />
                              </div>
                              <p className="text-[0.55rem] text-[#94a3b8] mt-0.5">
                                {wOccupied}/{wTables.length}{" "}
                                tables occupied
                              </p>
                            </div>

                            {/* Table "items" — each table as a row like kitchen items */}
                            <div className="px-3.5 pb-2.5 space-y-1">
                              {wFilteredTables.map((table) => {
                                const tCfg =
                                  TABLE_STATUS_COLORS[
                                    table.status
                                  ];
                                const tOrder = table.order_id
                                  ? kitchenOrders.find(
                                      (o) =>
                                        o.order_id ===
                                        table.order_id,
                                    )
                                  : undefined;
                                const isOccupied =
                                  table.status === "occupied";
                                const isAlert =
                                  table.status ===
                                  "needs_attention";
                                return (
                                  <div
                                    key={table.id}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                                      isAlert
                                        ? "bg-red-100/50 border border-red-200"
                                        : isOccupied
                                          ? "bg-white/70 border border-gray-200"
                                          : "bg-green-100/30 border border-green-200"
                                    }`}
                                  >
                                    <span
                                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${tCfg.badge}`}
                                    >
                                      {(() => {
                                        const I = tCfg.icon;
                                        return (
                                          <I className="w-2.5 h-2.5 text-white" />
                                        );
                                      })()}
                                    </span>
                                    <span className="flex-1 text-[0.72rem] text-[#2e3a59]">
                                      T{table.id}{" "}
                                      <span className="text-[#94a3b8]">
                                        ({table.guests}/
                                        {table.seats})
                                      </span>
                                    </span>
                                    {tOrder && (
                                      <span className="text-[0.6rem] text-[#ff6b35]">
                                        {tOrder.order_id}
                                      </span>
                                    )}
                                    {tOrder && (
                                      <span className="text-[0.55rem] text-[#94a3b8]">
                                        {getElapsed(
                                          tOrder.created_at,
                                        )}
                                        m
                                      </span>
                                    )}
                                    {!tOrder && (
                                      <span
                                        className={`text-[0.58rem] ${tCfg.text} capitalize`}
                                      >
                                        {table.status.replace(
                                          "_",
                                          " ",
                                        )}
                                      </span>
                                    )}
                                    {isAlert && (
                                      <button
                                        onClick={() =>
                                          clearAttention(
                                            table.id,
                                          )
                                        }
                                        className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[0.5rem] cursor-pointer hover:brightness-110"
                                      >
                                        Fix
                                      </button>
                                    )}
                                    {tOrder &&
                                      tOrder.status !==
                                        "Served" &&
                                      tOrder.items.length > 0 &&
                                      tOrder.items.every(
                                        (it) => it.done,
                                      ) && (
                                        <button
                                          onClick={() =>
                                            markOrderDone(
                                              tOrder.id,
                                            )
                                          }
                                          className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[0.5rem] cursor-pointer hover:brightness-110"
                                        >
                                          Done
                                        </button>
                                      )}
                                  </div>
                                );
                              })}
                              {wFilteredTables.length === 0 && (
                                <div className="py-3 text-center">
                                  <p className="text-[0.62rem] text-[#94a3b8]">
                                    No tables match filter
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {waiterNames.length === 0 && (
                    <div className="text-center py-16">
                      <User className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
                      <p className="text-muted-foreground text-[0.82rem]">
                        No waiters assigned
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ========== PARCEL TAB ========== */}
          {activeTab === "parcel" && (
            <motion.div
              key="parcel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Parcel summary */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  {
                    label: "Received",
                    value: pCounts.Received,
                    icon: Bell,
                    color:
                      "bg-blue-50 text-blue-600 border-blue-200",
                  },
                  {
                    label: "Packing",
                    value: pCounts.Packing,
                    icon: Package,
                    color:
                      "bg-amber-50 text-amber-600 border-amber-200",
                  },
                  {
                    label: "Ready",
                    value: pCounts.Ready,
                    icon: PackageCheck,
                    color:
                      "bg-green-50 text-green-600 border-green-200",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-xl p-4 border ${s.color}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="w-4 h-4" />
                      <span className="text-[0.78rem]">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[1.4rem] text-foreground">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Parcel cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {activeParcel.map((order) => {
                    const elapsed = getElapsed(
                      order.created_at,
                    );
                    const remaining = getTimeRemaining(
                      order.estimated_ready,
                    );
                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`bg-white rounded-2xl border p-4 ${
                          order.status === "Received"
                            ? "border-blue-200"
                            : order.status === "Packing"
                              ? "border-amber-200"
                              : "border-green-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-[1rem] text-foreground shadow-sm">
                              #{order.token}
                            </span>
                            <div>
                              <p className="text-[0.78rem] text-foreground">
                                {order.customer_name}
                              </p>
                              <p className="text-[0.6rem] text-muted-foreground">
                                {order.phone}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-lg text-[0.62rem] ${
                              order.status === "Received"
                                ? "bg-blue-100 text-blue-700"
                                : order.status === "Packing"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="space-y-0.5 mb-3">
                          {order.items.map((it, i) => (
                            <p
                              key={i}
                              className="text-[0.72rem] text-foreground"
                            >
                              {it.name}{" "}
                              <span className="text-[#ff6b35]">
                                x{it.quantity}
                              </span>
                            </p>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 text-[0.62rem] text-muted-foreground">
                            <span>
                              <Clock className="w-3 h-3 inline" />{" "}
                              {elapsed}m ago
                            </span>
                            <span>
                              <CreditCard className="w-3 h-3 inline" />{" "}
                              {order.payment}
                            </span>
                          </div>
                          <span className="text-[0.78rem] text-[#ff6b35]">
                            Rs.{order.total}
                          </span>
                        </div>

                        {order.status !== "Ready" && (
                          <div
                            className={`mb-3 text-[0.6rem] flex items-center gap-1 ${remaining <= 0 ? "text-red-500" : remaining <= 5 ? "text-amber-600" : "text-green-600"}`}
                          >
                            <Timer className="w-3 h-3" />
                            {remaining <= 0
                              ? "Overdue!"
                              : `~${remaining}m to ready`}
                          </div>
                        )}

                        <button
                          onClick={() =>
                            advanceParcelStatus(order.id)
                          }
                          className={`w-full py-2 rounded-xl text-[0.75rem] text-white cursor-pointer hover:brightness-110 flex items-center justify-center gap-1.5 ${
                            order.status === "Received"
                              ? "bg-amber-500"
                              : order.status === "Packing"
                                ? "bg-green-500"
                                : "bg-blue-500"
                          }`}
                        >
                          {order.status === "Received" && (
                            <>
                              <Package className="w-3.5 h-3.5" />{" "}
                              {L("km.start.packing")}
                            </>
                          )}
                          {order.status === "Packing" && (
                            <>
                              <Check className="w-3.5 h-3.5" />{" "}
                              {L("km.mark.ready")}
                            </>
                          )}
                          {order.status === "Ready" && (
                            <>
                              <CheckCheck className="w-3.5 h-3.5" />{" "}
                              {L("km.picked.up")}
                            </>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {activeParcel.length === 0 && (
                <div className="text-center py-16">
                  <Package className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
                  <p className="text-muted-foreground text-[0.82rem]">
                    {L("km.no.parcels")}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Bottom status bar ===== */}
      <div className="bg-white border-t border-border px-4 lg:px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-[0.68rem]">
          <span className="flex items-center gap-1 text-amber-600">
            <Flame className="w-3.5 h-3.5" />{" "}
            {kCounts.Preparing} {L("km.cooking")}
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <Check className="w-3.5 h-3.5" /> {kCounts.Ready}{" "}
            {L("km.ready")}
          </span>
          <span className="flex items-center gap-1 text-purple-600">
            <Package className="w-3.5 h-3.5" />{" "}
            {pCounts.Packing} {L("km.packing")}
          </span>
          <span className="flex items-center gap-1 text-blue-600">
            <Users className="w-3.5 h-3.5" /> {occupiedTables}/
            {tables.length} {L("km.tables.occupied")}
          </span>
        </div>
        {kitchenOrders.some(
          (o) => o.priority === "rush" && o.status !== "Served",
        ) && (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[0.65rem]">
            <AlertTriangle className="w-3 h-3" />{" "}
            {L("km.rush.orders")}
          </span>
        )}
      </div>

      {/* ===== Order Flow Modal ===== */}
      <AnimatePresence>
        {showOrderFlow && (
          <WaiterOrderFlow
            tables={tables}
            waiterNames={waiterNames}
            onPlaceOrder={handlePlaceOrder}
            onClose={() => setShowOrderFlow(false)}
          />
        )}
      </AnimatePresence>

      {/* ===== Item Detail Modal ===== */}
      <AnimatePresence>
        {selectedAggItem &&
          (() => {
            const agg = aggregatedItems.find(
              (a) => a.name === selectedAggItem,
            );
            if (!agg) return null;
            const sortedOrders = [...agg.orders].sort(
              (a, b) => b.elapsed - a.elapsed,
            );
            const allDone = agg.pendingQty === 0;
            return (
              <motion.div
                key="item-detail-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                onClick={() => setSelectedAggItem(null)}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: 20 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 20,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-[14px] w-full max-w-md overflow-hidden shadow-2xl font-['Inter',sans-serif]"
                >
                  {/* Modal header */}
                  <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-[#fff8f5] to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                            allDone
                              ? "bg-green-100"
                              : agg.worstUrgency === "overdue"
                                ? "bg-red-100"
                                : "bg-[#fff3ed]"
                          }`}
                        >
                          <span
                            className={`text-[1.3rem] ${
                              allDone
                                ? "text-green-600"
                                : agg.worstUrgency === "overdue"
                                  ? "text-red-600"
                                  : "text-[#ff6b35]"
                            }`}
                          >
                            {allDone ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              agg.pendingQty
                            )}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-[0.95rem] text-[#2e3a59]">
                            {agg.name}
                          </h3>
                          <p className="text-[0.68rem] text-[#94a3b8]">
                            Total ×{agg.totalQty} ·{" "}
                            {agg.orders.length} order
                            {agg.orders.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAggItem(null)}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4 text-[#94a3b8]" />
                      </button>
                    </div>

                    {/* Summary pills */}
                    <div className="flex gap-2 mt-3">
                      {agg.pendingQty > 0 && (
                        <span className="text-[0.65rem] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Flame className="w-3 h-3" />{" "}
                          {agg.pendingQty} to make
                        </span>
                      )}
                      {agg.doneQty > 0 && (
                        <span className="text-[0.65rem] px-2.5 py-1 rounded-full bg-green-100 text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />{" "}
                          {agg.doneQty} done
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order list sorted by elapsed time */}
                  <div className="px-3 py-3 max-h-[50vh] overflow-y-auto">
                    <p className="text-[0.62rem] text-[#94a3b8] px-2 mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Sorted by
                      waiting time (longest first)
                    </p>
                    <div className="space-y-2">
                      {sortedOrders.map((o, idx) => {
                        const urgencyColor =
                          o.urgency === "overdue"
                            ? "border-red-200 bg-red-50/60"
                            : o.urgency === "warning"
                              ? "border-amber-200 bg-amber-50/40"
                              : "border-gray-100 bg-white";
                        const timeColor =
                          o.urgency === "overdue"
                            ? "text-red-600 bg-red-100"
                            : o.urgency === "warning"
                              ? "text-amber-600 bg-amber-100"
                              : "text-green-600 bg-green-100";
                        const isDine = !!o.table;

                        return (
                          <motion.div
                            key={o.orderId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: idx * 0.04,
                              type: "spring",
                              stiffness: 400,
                              damping: 20,
                            }}
                            className={`p-3 rounded-xl border ${urgencyColor} ${o.done ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                {/* Rank */}
                                <span className="text-[0.65rem] text-[#94a3b8] w-4 text-center">
                                  #{idx + 1}
                                </span>
                                {/* Type indicator */}
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDine ? "bg-blue-100" : "bg-green-100"}`}
                                >
                                  {isDine ? (
                                    <Armchair className="w-3.5 h-3.5 text-blue-600" />
                                  ) : (
                                    <Package className="w-3.5 h-3.5 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[0.78rem] text-[#2e3a59]">
                                      {o.orderLabel}
                                    </span>
                                    {o.done && (
                                      <Check className="w-3 h-3 text-green-500" />
                                    )}
                                  </div>
                                  <p className="text-[0.6rem] text-[#94a3b8]">
                                    {isDine ? (
                                      <span className="text-blue-600">
                                        Table {o.table}
                                      </span>
                                    ) : (
                                      <span className="text-green-600">
                                        Parcel
                                      </span>
                                    )}
                                    {" · "}
                                    {o.status}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Quantity */}
                                <span
                                  className={`text-[0.82rem] px-2 py-0.5 rounded-lg ${o.done ? "bg-green-100 text-green-600 line-through" : "bg-[#fff3ed] text-[#ff6b35]"}`}
                                >
                                  ×{o.qty}
                                </span>
                                {/* Time badge */}
                                <span
                                  className={`text-[0.65rem] px-2 py-1 rounded-lg flex items-center gap-1 ${timeColor}`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {o.elapsed}m
                                </span>
                              </div>
                            </div>

                            {/* Overdue pulse */}
                            {o.urgency === "overdue" &&
                              !o.done && (
                                <div className="mt-2 flex items-center gap-1.5 text-[0.58rem] text-red-600">
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                  </span>
                                  Overdue — needs attention!
                                </div>
                              )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal footer */}
                  <div className="px-5 py-3 border-t border-border bg-[#f8f9fb] flex items-center justify-between">
                    <span className="text-[0.62rem] text-[#94a3b8]">
                      {
                        sortedOrders.filter((o) => !o.done)
                          .length
                      }{" "}
                      pending ·{" "}
                      {
                        sortedOrders.filter((o) => o.done)
                          .length
                      }{" "}
                      completed
                    </span>
                    <button
                      onClick={() => setSelectedAggItem(null)}
                      className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-[0.72rem] cursor-pointer hover:brightness-110 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}