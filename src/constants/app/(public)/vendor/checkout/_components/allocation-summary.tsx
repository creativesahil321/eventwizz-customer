/**
 * Allocation Summary Component
 * Shows a clean summary of guest allocation in the cart
 */

import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle } from "lucide-react";
import { EditableItem } from "@/store/cart-edit.store";

interface AllocationSummaryProps {
  selectedTables: EditableItem[];
  totalGuests: number;
  className?: string;
}

export default function AllocationSummary({
  selectedTables,
  totalGuests,
  className = "",
}: AllocationSummaryProps) {
  // Calculate total allocated guests
  const totalAllocated = selectedTables.reduce((sum, table) => {
    if (table.allocation && table.allocation.length > 0) {
      return (
        sum +
        table.allocation.reduce(
          (tableSum, guestCount) => tableSum + guestCount,
          0
        )
      );
    }
    return sum;
  }, 0);

  const isComplete = totalAllocated === totalGuests;

  if (selectedTables.length === 0) return null;

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">
            Guest Allocation
          </h4>
        </div>
        {isComplete && (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Guests:</span>
          <span className="font-medium">{totalGuests}</span>
        </div>

        {selectedTables.map((table) => {
          if (!table.allocation || table.allocation.length === 0) return null;

          return (
            <div key={table.id} className="text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{table.title}:</span>
                <span className="font-medium">
                  {table.allocation.join(", ")} guests
                </span>
              </div>
            </div>
          );
        })}

        {!isComplete && (
          <div className="text-xs text-orange-600 mt-2 p-2 bg-orange-50 rounded">
            Guest allocation incomplete ({totalAllocated}/{totalGuests}{" "}
            assigned)
          </div>
        )}
      </div>
    </div>
  );
}
