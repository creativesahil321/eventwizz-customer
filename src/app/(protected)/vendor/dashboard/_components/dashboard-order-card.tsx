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
}

/**
 * Component to display order statistics in cards
 */
export default function OrderCard({ orders }: OrderCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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
