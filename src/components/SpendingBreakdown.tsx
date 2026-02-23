"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { formatCurrencyCOP } from "@/utils/formatters";

type TxRow = {
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

type InvestmentRow = {
  name: string;
  investment_type: string;
  invested_amount: number;
  started_at: string | null;
  created_at?: string | null;
};

type BillRow = {
  title: string;
  amount: number;
  due_date: string;
  status: string;
};

type Item = {
  name: string;
  amount: number;
  percentage: number;
  color: string;
};

type BillImpactMode = "due_or_overdue" | "pending_month" | "all_pending";

function getBillImpactMode(): BillImpactMode {
  const raw = (process.env.NEXT_PUBLIC_PANEL_BILLS_MODE || "pending_month").toLowerCase();
  if (raw === "pending_month" || raw === "all_pending") return raw;
  return "due_or_overdue";
}

function shouldIncludeBill(
  bill: BillRow,
  mode: BillImpactMode,
  todayISO: string,
  monthStartISO: string,
  nextMonthStartISO: string
) {
  const pending = bill.status !== "Pagado";
  if (!pending) return false;

  if (mode === "all_pending") return true;
  if (mode === "pending_month") {
    return bill.due_date >= monthStartISO && bill.due_date < nextMonthStartISO;
  }

  return bill.due_date <= todayISO;
}

type TooltipState = {
  item: Item;
  x: number;
  y: number;
};

function getSegmentColor(index: number, total: number) {
  const hue = Math.round((index * (360 / Math.max(total, 1))) % 360);
  return `hsl(${hue} 72% 52%)`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function SpendingBreakdown({
  transactions,
  investments,
  bills,
  todayISO,
}: {
  transactions: TxRow[];
  investments: InvestmentRow[];
  bills: BillRow[];
  todayISO: string;
}) {
  const [hovered, setHovered] = useState<Item | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const { items, total } = useMemo(() => {
    const now = new Date(`${todayISO}T00:00:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const month = now.getMonth();
    const year = now.getFullYear();
    const billImpactMode = getBillImpactMode();

    const expenseByCategory = new Map<string, number>();

    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const txDate = new Date(`${tx.date}T00:00:00`);
      const isCurrentMonth = txDate.getMonth() === month && txDate.getFullYear() === year;
      const isElapsedDay = txDate <= today;
      if (!isCurrentMonth || !isElapsedDay) return;

      const key = tx.category || "Sin categoría";
      expenseByCategory.set(key, (expenseByCategory.get(key) || 0) + Math.abs(Number(tx.amount) || 0));
    });

    investments.forEach((inv) => {
      const sourceDate = inv.started_at || inv.created_at?.slice(0, 10);
      if (!sourceDate) return;
      const invDate = new Date(`${sourceDate}T00:00:00`);
      const isCurrentMonth = invDate.getMonth() === month && invDate.getFullYear() === year;
      const isElapsedDay = invDate <= today;
      if (!isCurrentMonth || !isElapsedDay) return;

      const key = inv.investment_type?.trim() || "Inversiones";
      expenseByCategory.set(key, (expenseByCategory.get(key) || 0) + Math.abs(Number(inv.invested_amount) || 0));
    });

    const monthStartISO = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const nextMonth = new Date(year, month + 1, 1);
    const nextMonthStartISO = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

    bills.forEach((bill) => {
      if (!shouldIncludeBill(bill, billImpactMode, todayISO, monthStartISO, nextMonthStartISO)) return;

      const key = "Facturas";
      expenseByCategory.set(key, (expenseByCategory.get(key) || 0) + Math.abs(Number(bill.amount) || 0));
    });

    const totalAmount = Array.from(expenseByCategory.values()).reduce((sum, value) => sum + value, 0);

    const mapped = Array.from(expenseByCategory.entries())
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        color: getSegmentColor(index, expenseByCategory.size),
      }))
      .sort((a, b) => b.amount - a.amount);

    return { items: mapped, total: totalAmount };
  }, [transactions, investments, bills, todayISO]);

  const totalLabel = formatCurrencyCOP(total);
  const centerLabel = hovered
    ? `${hovered.name} · ${formatCurrencyCOP(hovered.amount)} (${hovered.percentage.toFixed(1)}%)`
    : totalLabel;

  const size = 220;
  const stroke = 18;
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const fullCircleGap = Math.min(10, Math.max(4, circumference * 0.015));
  let cursorAngle = 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold">Desglose de Gastos</h3>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-10">
        <div className="relative w-[220px] h-[220px] shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {items.length === 0 ? (
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
            ) : (
              items.map((item) => {
                const start = cursorAngle;
                const sweep = (item.percentage / 100) * 360;
                const end = start + sweep;
                cursorAngle = end;

                if (sweep >= 359.999) {
                  return (
                    <circle
                      key={item.name}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${Math.max(circumference - fullCircleGap, 0)} ${fullCircleGap}`}
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      className="cursor-pointer transition-opacity hover:opacity-85"
                      onMouseEnter={(event) => {
                        setHovered(item);
                        setTooltip({
                          item,
                          x: event.clientX + 12,
                          y: event.clientY - 12,
                        });
                      }}
                      onMouseMove={(event) => {
                        setTooltip({
                          item,
                          x: event.clientX + 12,
                          y: event.clientY - 12,
                        });
                      }}
                      onMouseLeave={() => {
                        setHovered(null);
                        setTooltip(null);
                      }}
                    />
                  );
                }

                return (
                  <path
                    key={item.name}
                    d={describeArc(size / 2, size / 2, radius, start, end)}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={stroke}
                    strokeLinecap="butt"
                    className="cursor-pointer transition-opacity hover:opacity-85"
                    onMouseEnter={(event) => {
                      setHovered(item);
                      setTooltip({
                        item,
                        x: event.clientX + 12,
                        y: event.clientY - 12,
                      });
                    }}
                    onMouseMove={(event) => {
                      setTooltip({
                        item,
                        x: event.clientX + 12,
                        y: event.clientY - 12,
                      });
                    }}
                    onMouseLeave={() => {
                      setHovered(null);
                      setTooltip(null);
                    }}
                  />
                );
              })
            )}
          </svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
            <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-inner text-center">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                {hovered ? "Categoría" : "Total mes"}
              </span>
              <span className="text-xs font-bold leading-tight wrap-break-word">{centerLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-h-72 overflow-auto space-y-3 pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">No hay gastos registrados.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
                <span className="text-sm font-bold whitespace-nowrap">
                  {formatCurrencyCOP(item.amount)} · {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {tooltip ? (
        <div
          className="fixed z-[70] pointer-events-none px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-xs font-bold">{tooltip.item.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {formatCurrencyCOP(tooltip.item.amount)} ({tooltip.item.percentage.toFixed(1)}%)
          </p>
        </div>
      ) : null}
    </div>
  );
}
