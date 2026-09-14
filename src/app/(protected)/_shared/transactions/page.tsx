"use client";

import { Shell } from "@/components/shell";
import { useTransactionSystem } from "./_lib/hooks";
import {
  TransactionDetailsComponent,
  TransactionsDataTable,
} from "./_components";

export default function TransactionsPage() {
  const {
    filters,
    transactions,
    stats,
    selectedTransaction,
    isDetailsOpen,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    handleFilterChange,
    handleViewDetails,
    handleCloseDetails,
  } = useTransactionSystem();

  return (
    <section className="page max-w-full overflow-x-hidden">
      <Shell className="gap-2 overflow-x-hidden">
        <TransactionsDataTable
          transactions={transactions}
          stats={stats}
          filters={filters}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          onFilterChange={handleFilterChange}
          onViewDetails={handleViewDetails}
        />

        <TransactionDetailsComponent
          transaction={selectedTransaction}
          isOpen={isDetailsOpen}
          onClose={handleCloseDetails}
        />
      </Shell>
    </section>
  );
}
