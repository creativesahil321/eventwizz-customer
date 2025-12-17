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
    meta,
    stats,
    selectedTransaction,
    isDetailsOpen,
    isLoading,
    handleFilterChange,
    handlePageChange,
    handleViewDetails,
    handleCloseDetails,
  } = useTransactionSystem();

  // Convert the API meta format to the expected format for the component
  const formattedMeta = meta
    ? {
        total: meta.total || 0,
        current_page: meta.current_page || 1,
        per_page: meta.per_page || 10,
        last_page: meta.last_page || 1,
      }
    : undefined;

  return (
    <section className="page">
      <Shell className="gap-2">
        <TransactionsDataTable
          transactions={transactions}
          meta={formattedMeta}
          stats={stats}
          filters={filters}
          isLoading={isLoading}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
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

