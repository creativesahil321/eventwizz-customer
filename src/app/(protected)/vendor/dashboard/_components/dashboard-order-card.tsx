import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CircleDollarSign,
  CreditCard,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

/**
 * Order card item interface
 */
interface OrderItem {
  title: string;
  value: string | number;
}

/**
 * OrderCard component props interface
 */
interface OrderCardProps {
  orders: OrderItem[];
  /** Number of columns on large screens. Use 2 for fewer cards (e.g. Commissions). @default 4 */
  columns?: 2 | 4;
}

function getOrderItemIcon(title: string): LucideIcon {
  const normalizedTitle = title.trim().toLowerCase();

  switch (normalizedTitle) {
    case "total bookings":
      return ShoppingCart;
    case "total payment":
      return CircleDollarSign;
    case "received payment":
      return CreditCard;
    case "total commission":
      return ReceiptText;
    case "commission due":
      return BadgeDollarSign;
    default:
      return ShoppingCart;
  }
}

/**
 * Component to display order statistics in cards
 */
export default function OrderCard({ orders, columns = 4 }: OrderCardProps) {
  const isThreeWideLayout = columns === 4 && orders.length === 3;

  const gridCols =
    columns === 2
      ? "sm:grid-cols-2 lg:grid-cols-2"
      : isThreeWideLayout
        ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
        : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {orders.map((order: OrderItem, index: number) => {
        const Icon = getOrderItemIcon(order.title);

        return (
          <div className="w-full bg-background items-center" key={index}>
            <article className="border shadow-sm p-6 rounded-sm">
              <section className="w-full flex items-start justify-between gap-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <section className="w-full flex items-start lg:items-end justify-between lg:justify-end flex-col">
                  <p className="text-base text-muted-foreground">{order.title}</p>
                  <p className="text-2xl font-bold">{order.value}</p>
                </section>
              </section>
            </article>
          </div>
        );
      })}
    </div>
  );
}
