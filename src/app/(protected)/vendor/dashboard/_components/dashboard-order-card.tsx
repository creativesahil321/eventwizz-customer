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

/**
 * Component to display order statistics in cards
 */
export default function OrderCard({ orders, columns = 4 }: OrderCardProps) {
  const gridCols = columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {orders.map((order: OrderItem, index: number) => {
        return (
          <div className="w-full bg-background items-center" key={index}>
            <article className="border shadow-sm p-6 rounded-sm">
              <section className="w-full flex items-start lg:items-end justify-between lg:justify-end flex-col">
                <p className="text-base text-muted-foreground">{order.title}</p>
                <p className="text-2xl font-bold">{order.value}</p>
              </section>
            </article>
          </div>
        );
      })}
    </div>
  );
}
