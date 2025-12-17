# 🪑 EventWizz Table System Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Table Data Structure](#table-data-structure)
3. [Table Recommendation Engine](#table-recommendation-engine)
4. [Guest Allocation System](#guest-allocation-system)
5. [Table Booking Flow](#table-booking-flow)
6. [API Integration](#api-integration)
7. [UI Components](#ui-components)
8. [Algorithms](#algorithms)
9. [Validation System](#validation-system)
10. [Performance Considerations](#performance-considerations)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The EventWizz Table System is a sophisticated table management and booking system that handles:
- **Smart Table Recommendations**: AI-powered suggestions based on guest count
- **Guest Allocation**: Interactive distribution of guests across tables
- **Capacity Management**: Min/max person constraints
- **Cost Optimization**: Efficient table utilization
- **Real-time Validation**: Live validation of allocations

### Key Features

- ✅ **Intelligent Recommendations**: Algorithm-based table suggestions
- ✅ **Auto-Arrangement**: Automatic guest distribution
- ✅ **Manual Override**: User can manually adjust allocations
- ✅ **Real-time Validation**: Live feedback on allocation validity
- ✅ **Cost Optimization**: Minimize wasted seats and costs
- ✅ **Visual Feedback**: Clear UI indicators for recommendations

---

## 📊 Table Data Structure

### Core Table Interface

```typescript
interface TableData {
  id: number;
  min_persons: number;
  max_persons: number;
  price: number; // Price per person
  total_tables: number;
  event_date: string;
}
```

### Editable Table Interface

```typescript
interface EditableItem {
  id: number;
  title: string;
  description: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  type: "table" | "ticket" | "drink";
  depositAmount: number;
  
  // Table-specific properties
  allocation: number[]; // [4, 6, 2] = guests per table
  minPersons: number;
  maxPersons: number;
  tableSize: number;
  pricePerPerson: number;
}
```

### Table Recommendation Interface

```typescript
interface TableRecommendation {
  table: EditableItem;
  fit: "perfect" | "good" | "oversized" | "multiple";
  totalCost: number;
  tablesNeeded: number;
  wastedSeats: number;
  recommendation: string;
  priority: number; // Lower = better recommendation
}

interface RecommendationResult {
  recommended: TableRecommendation[];
  otherOptions: TableRecommendation[];
  hasRecommendations: boolean;
}
```

---

## 🧠 Table Recommendation Engine

### Algorithm Overview

The recommendation engine analyzes guest count against available table configurations to suggest optimal arrangements.

```typescript
export function generateTableRecommendations(
  tables: EditableItem[],
  peopleCount: number
): RecommendationResult {
  if (peopleCount <= 0 || tables.length === 0) {
    return {
      recommended: [],
      otherOptions: [],
      hasRecommendations: false,
    };
  }

  const recommendations: TableRecommendation[] = [];

  // Process each table type
  tables.forEach((table) => {
    const { minPersons, maxPersons } = parseTableCapacity(table);
    
    if (minPersons === 0 && maxPersons === 0) {
      return; // Skip invalid table data
    }

    const recommendation = calculateTableRecommendation(
      table,
      peopleCount,
      minPersons,
      maxPersons
    );

    if (recommendation) {
      recommendations.push(recommendation);
    }
  });

  // Sort by priority (lower = better)
  recommendations.sort((a, b) => a.priority - b.priority);

  // Split into recommended (top 3) and other options
  const recommended = recommendations.slice(0, 3);
  const otherOptions = recommendations.slice(3);

  return {
    recommended,
    otherOptions,
    hasRecommendations: recommendations.length > 0,
  };
}
```

### Recommendation Types

#### 1. Perfect Fit
```typescript
// Guest count exactly matches table capacity
if (peopleCount >= minPersons && peopleCount <= maxPersons) {
  const wastedSeats = maxPersons - peopleCount;
  const totalCost = pricePerPerson * peopleCount;

  return {
    table,
    fit: "perfect",
    totalCost,
    tablesNeeded: 1,
    wastedSeats,
    recommendation: wastedSeats === 0
      ? `Perfect fit for ${peopleCount} people`
      : `Great fit - ${wastedSeats} extra seat${wastedSeats > 1 ? "s" : ""} available`,
    priority: wastedSeats, // Lower waste = higher priority
  };
}
```

#### 2. Multiple Tables
```typescript
// Guest count exceeds single table capacity
if (peopleCount > maxPersons) {
  const tablesNeeded = Math.ceil(peopleCount / maxPersons);
  const totalCapacity = tablesNeeded * maxPersons;
  const wastedSeats = totalCapacity - peopleCount;
  const totalCost = pricePerPerson * peopleCount;

  // Check availability
  if (tablesNeeded > table.maxQuantity) {
    return null; // Not enough tables available
  }

  return {
    table,
    fit: "multiple",
    totalCost,
    tablesNeeded,
    wastedSeats,
    recommendation: wastedSeats === 0
      ? `Perfect fit - ${tablesNeeded} tables needed`
      : `Good option - ${tablesNeeded} tables (${wastedSeats} extra seats)`,
    priority: 100 + wastedSeats, // Lower priority than perfect fits
  };
}
```

#### 3. Oversized Table
```typescript
// Guest count below minimum capacity
if (peopleCount < minPersons) {
  const wastedSeats = minPersons - peopleCount;
  const totalCost = pricePerPerson * peopleCount;

  return {
    table,
    fit: "oversized",
    totalCost,
    tablesNeeded: 1,
    wastedSeats,
    recommendation: `Larger table - ${wastedSeats} empty seat${wastedSeats > 1 ? "s" : ""} available`,
    priority: 200 + wastedSeats, // Lowest priority
  };
}
```

### Table Capacity Parsing

```typescript
function parseTableCapacity(table: EditableItem): {
  minPersons: number;
  maxPersons: number;
} {
  // Try to extract from title first (current format)
  const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);
  if (titleMatch) {
    const min = parseInt(titleMatch[1]);
    const max = parseInt(titleMatch[2]);

    // Handle reversed values (412-158 should be 158-412)
    return {
      minPersons: Math.min(min, max),
      maxPersons: Math.max(min, max),
    };
  }

  // Try to extract from description
  const descMatch = table.description?.match(/(\d+)\s+to\s+(\d+)\s+people/);
  if (descMatch) {
    const min = parseInt(descMatch[1]);
    const max = parseInt(descMatch[2]);

    return {
      minPersons: Math.min(min, max),
      maxPersons: Math.max(min, max),
    };
  }

  // Default fallback - assume reasonable capacity based on price
  const estimatedCapacity = Math.max(4, Math.floor(table.price / 50));

  return {
    minPersons: Math.max(1, estimatedCapacity - 2),
    maxPersons: estimatedCapacity + 2,
  };
}
```

---

## 👥 Guest Allocation System

### Allocation Data Structure

```typescript
interface TableAllocationData {
  tableId: number;
  title: string;
  minPersons: number;
  maxPersons: number;
  quantity: number;
  allocation: number[]; // [4, 6, 2] = guests per table
}

interface AllocationResult {
  isValid: boolean;
  totalAllocated: number;
  totalRequired: number;
  errors: string[];
  suggestions?: string[];
}
```

### Auto-Arrangement Algorithm

```typescript
export function autoArrangeGuests(
  tables: Array<{
    id: number;
    title: string;
    minPersons: number;
    maxPersons: number;
    quantity: number;
  }>,
  totalGuests: number
): Record<number, number[]> {
  const result: Record<number, number[]> = {};

  if (totalGuests <= 0 || tables.length === 0) {
    return result;
  }

  // Create array of all individual tables with their constraints
  const allTables: Array<{
    tableId: number;
    minPersons: number;
    maxPersons: number;
    index: number; // Index within the table type
  }> = [];

  tables.forEach((table) => {
    for (let i = 0; i < table.quantity; i++) {
      allTables.push({
        tableId: table.id,
        minPersons: table.minPersons,
        maxPersons: table.maxPersons,
        index: i,
      });
    }
  });

  if (allTables.length === 0) {
    return result;
  }

  // Initialize result structure
  tables.forEach((table) => {
    result[table.id] = Array(table.quantity).fill(table.minPersons);
  });

  // Calculate minimum required guests
  const minRequired = allTables.reduce(
    (sum, table) => sum + table.minPersons,
    0
  );

  if (totalGuests < minRequired) {
    // Not enough guests - distribute what we have proportionally
    let remaining = totalGuests;
    allTables.forEach((table) => {
      const allocation = Math.min(remaining, table.minPersons);
      const tableIndex = tables.findIndex((t) => t.id === table.tableId);
      if (tableIndex >= 0) {
        result[table.tableId][table.index] = allocation;
      }
      remaining -= allocation;
    });
    return result;
  }

  // Distribute remaining guests after minimum allocation
  let remaining = totalGuests - minRequired;

  // Sort tables by available capacity (max - min) descending
  const sortedTables = allTables
    .map((table) => ({
      ...table,
      availableCapacity: table.maxPersons - table.minPersons,
    }))
    .sort((a, b) => b.availableCapacity - a.availableCapacity);

  // Distribute remaining guests
  while (remaining > 0 && sortedTables.length > 0) {
    let distributed = false;

    for (let i = 0; i < sortedTables.length; i++) {
      const table = sortedTables[i];
      const currentAllocation = result[table.tableId][table.index];
      
      if (currentAllocation < table.maxPersons) {
        const canAdd = Math.min(remaining, table.maxPersons - currentAllocation);
        result[table.tableId][table.index] += canAdd;
        remaining -= canAdd;
        distributed = true;
        
        if (currentAllocation + canAdd >= table.maxPersons) {
          sortedTables.splice(i, 1);
          i--;
        }
        break;
      }
    }

    if (!distributed) {
      break;
    }
  }

  return result;
}
```

### Allocation Validation

```typescript
export function validateAllocation(
  tables: TableAllocationData[],
  totalGuests: number
): AllocationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let totalAllocated = 0;

  // Validate each table
  tables.forEach((table) => {
    if (!table.allocation || table.allocation.length !== table.quantity) {
      errors.push(
        `${table.title} needs allocation for ${table.quantity} table${
          table.quantity > 1 ? "s" : ""
        }`
      );
      return;
    }

    table.allocation.forEach((guestCount, index) => {
      if (guestCount < table.minPersons) {
        errors.push(
          `${table.title} Table ${index + 1}: minimum ${
            table.minPersons
          } guests required (currently ${guestCount})`
        );
      }
      if (guestCount > table.maxPersons) {
        errors.push(
          `${table.title} Table ${index + 1}: maximum ${
            table.maxPersons
          } guests allowed (currently ${guestCount})`
        );
      }
      totalAllocated += guestCount;
    });
  });

  // Check total allocation
  if (totalAllocated !== totalGuests) {
    const difference = totalGuests - totalAllocated;
    if (difference > 0) {
      errors.push(
        `${difference} more guest${
          difference > 1 ? "s" : ""
        } need to be allocated`
      );
      suggestions.push(
        `Try using the "Auto Arrange" button to distribute guests automatically`
      );
    } else {
      errors.push(`${Math.abs(difference)} too many guests allocated`);
      suggestions.push(`Reduce guest count in some tables`);
    }
  }

  return {
    isValid: errors.length === 0,
    totalAllocated,
    totalRequired: totalGuests,
    errors,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
```

---

## 🔄 Table Booking Flow

### 1. Table Selection

```typescript
// User selects table type and quantity
const handleTableSelect = (tableId: number, quantity: number) => {
  updateQuantity(eventSlug, date, "table", tableId, quantity);
  
  // If quantity > 0, show guest allocation modal
  if (quantity > 0) {
    setShowAllocationModal(true);
  }
};
```

### 2. Guest Allocation

```typescript
// Open allocation modal with selected tables
const handleAllocationModal = () => {
  const selectedTables = dateData.tables.filter(t => t.quantity > 0);
  setSelectedTables(selectedTables);
  setTotalGuests(peopleCount);
  setShowAllocationModal(true);
};
```

### 3. Allocation Confirmation

```typescript
// Confirm allocation and update store
const handleAllocationConfirm = (allocations: Record<number, number[]>) => {
  Object.entries(allocations).forEach(([tableIdStr, allocation]) => {
    const tableId = parseInt(tableIdStr);
    updateTableAllocation(eventSlug, date, tableId, allocation);
  });
  setShowAllocationModal(false);
};
```

### 4. Validation and Checkout

```typescript
// Validate before checkout
const validation = validateGuestAllocation(eventSlug, date);
if (!validation.isValid) {
  toast.error(`Allocation errors: ${validation.errors.join(", ")}`);
  return;
}

// Proceed to checkout
const checkoutData = transformCartToCheckout(eventSlug, editingData, apiCartData);
await processCheckout(checkoutData);
```

---

## 🌐 API Integration

### Table Data Endpoints

```typescript
// Get table data for event date
GET /customer/event
Response: {
  "data": [{
    "2025-09-21": {
      "tables": [
        {
          "id": 1,
          "min_persons": 4,
          "max_persons": 8,
          "price": 50,
          "total_tables": 10,
          "event_date": "2025-09-21"
        }
      ]
    }
  }]
}

// Store table booking
POST /customer/event/store
{
  "tables": [
    {
      "id": 1,
      "table_size": 8,
      "price_per_person": 50,
      "no_tables": 2,
      "allocation": [6, 4]
    }
  ]
}
```

### Checkout Integration

```typescript
// Transform table data for checkout
const transformTables = (tables: EditableItem[]) => {
  return tables
    .filter(t => t.quantity > 0)
    .map(table => ({
      id: table.id,
      table_size: table.tableSize,
      price_per_person: table.pricePerPerson,
      no_tables: table.quantity,
      allocation: table.allocation
    }));
};
```

---

## 🎨 UI Components

### TableRecommendations Component

```typescript
export default function TableRecommendations({
  eventSlug,
  date,
  tables,
  onQuantityChange,
  onUpdateQuantity,
  getTotalQuantity,
}) {
  const { recommended, otherOptions } = useMemo(() => {
    return generateTableRecommendations(tables, peopleCount);
  }, [tables, peopleCount]);

  return (
    <div className="space-y-4">
      {/* People Count Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Number of People:</label>
        <div className="flex items-center gap-2">
          <button onClick={() => handlePeopleCountChange(-1)}>-</button>
          <input
            type="number"
            value={peopleCount}
            onChange={(e) => handleDirectInput(e.target.value)}
            className="w-20 px-2 py-1 border rounded"
          />
          <button onClick={() => handlePeopleCountChange(1)}>+</button>
        </div>
      </div>

      {/* Recommended Tables */}
      {recommended.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recommended Tables</h3>
          <div className="grid gap-3">
            {recommended.map((rec) => (
              <TableCard
                key={rec.table.id}
                recommendation={rec}
                onSelect={handleTableSelect}
                isRecommended={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Options */}
      {otherOptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Other Options</h3>
          <div className="grid gap-3">
            {otherOptions.map((rec) => (
              <TableCard
                key={rec.table.id}
                recommendation={rec}
                onSelect={handleTableSelect}
                isRecommended={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### TableCard Component

```typescript
interface TableCardProps {
  recommendation: TableRecommendation;
  onSelect: (tableId: number, quantity: number) => void;
  isRecommended: boolean;
}

export default function TableCard({ recommendation, onSelect, isRecommended }: TableCardProps) {
  const { table, fit, totalCost, tablesNeeded, wastedSeats, recommendation: recText } = recommendation;
  
  const badgeColor = getRecommendationBadgeColor(fit);
  const costPerPerson = getCostPerPerson(recommendation, peopleCount);

  return (
    <div className={`border rounded-lg p-4 ${isRecommended ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{table.title}</h4>
          <p className="text-sm text-gray-600">{table.description}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${badgeColor}`}>
          {formatRecommendationMessage(recommendation)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-sm text-gray-500">Total Cost:</span>
          <div className="font-semibold">£{totalCost.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-sm text-gray-500">Per Person:</span>
          <div className="font-semibold">£{costPerPerson.toFixed(2)}</div>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        {recText}
      </div>

      <button
        onClick={() => onSelect(table.id, tablesNeeded)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        Select {tablesNeeded} Table{tablesNeeded > 1 ? 's' : ''}
      </button>
    </div>
  );
}
```

### GuestAllocationModal Component

```typescript
export default function GuestAllocationModal({
  isOpen,
  onClose,
  selectedTables,
  totalGuests,
  onConfirm,
}) {
  const [allocations, setAllocations] = useState<Record<number, number[]>>({});
  const [isAutoArranging, setIsAutoArranging] = useState(false);

  // Initialize allocations when modal opens
  useEffect(() => {
    if (isOpen && selectedTables.length > 0) {
      const initialAllocations: Record<number, number[]> = {};

      selectedTables.forEach((table) => {
        const existingAllocation = table.allocation && table.allocation.length === table.quantity
          ? table.allocation
          : Array(table.quantity).fill(table.minPersons || 1);

        initialAllocations[table.id] = [...existingAllocation];
      });

      setAllocations(initialAllocations);
    }
  }, [isOpen, selectedTables]);

  // Auto-arrange functionality
  const handleAutoArrange = async () => {
    setIsAutoArranging(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate loading

      const tableData = selectedTables.map((table) => ({
        id: table.id,
        title: table.title,
        minPersons: table.minPersons || 1,
        maxPersons: table.maxPersons || 999,
        quantity: table.quantity,
      }));

      const autoArranged = autoArrangeGuests(tableData, totalGuests);
      setAllocations(autoArranged);

      toast.success("Guests arranged automatically!");
    } catch (error) {
      toast.error("Failed to auto-arrange guests");
    } finally {
      setIsAutoArranging(false);
    }
  };

  // Validation
  const validation = useMemo(() => {
    const tableAllocationData: TableAllocationData[] = selectedTables.map((table) => ({
      tableId: table.id,
      title: table.title,
      minPersons: table.minPersons || 1,
      maxPersons: table.maxPersons || 999,
      quantity: table.quantity,
      allocation: allocations[table.id] || Array(table.quantity).fill(table.minPersons || 1),
    }));

    return validateAllocation(tableAllocationData, totalGuests);
  }, [selectedTables, allocations, totalGuests]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Guest Allocation</h2>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Total Guests: {totalGuests}</span>
            <div className="flex gap-2">
              <button
                onClick={handleAutoArrange}
                disabled={isAutoArranging}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isAutoArranging ? "Arranging..." : "Auto Arrange"}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table Allocation Inputs */}
        <div className="space-y-4 mb-6">
          {selectedTables.map((table) => (
            <div key={table.id} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{table.title}</h3>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: table.quantity }, (_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">
                      Table {index + 1}:
                    </label>
                    <input
                      type="number"
                      min={table.minPersons}
                      max={table.maxPersons}
                      value={allocations[table.id]?.[index] || table.minPersons}
                      onChange={(e) => updateTableAllocation(table.id, index, e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                    <span className="text-xs text-gray-500">
                      ({table.minPersons}-{table.maxPersons})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <h4 className="text-sm font-medium text-red-800 mb-2">Allocation Errors:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.suggestions && validation.suggestions.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Suggestions:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {validation.suggestions.map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(allocations)}
            disabled={!validation.isValid}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Allocation
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## 🔧 Algorithms

### Cost Optimization Algorithm

```typescript
function calculateOptimalTableConfiguration(
  tables: EditableItem[],
  peopleCount: number
): TableRecommendation[] {
  const configurations: TableRecommendation[] = [];

  // Generate all possible table combinations
  const combinations = generateTableCombinations(tables, peopleCount);

  // Evaluate each combination
  combinations.forEach(combination => {
    const totalCost = combination.reduce((sum, table) => {
      return sum + (table.pricePerPerson * table.quantity * table.avgGuestsPerTable);
    }, 0);

    const wastedSeats = combination.reduce((sum, table) => {
      const totalCapacity = table.maxPersons * table.quantity;
      const usedCapacity = table.avgGuestsPerTable * table.quantity;
      return sum + (totalCapacity - usedCapacity);
    }, 0);

    configurations.push({
      tables: combination,
      totalCost,
      wastedSeats,
      efficiency: (peopleCount / (peopleCount + wastedSeats)) * 100,
      priority: totalCost + (wastedSeats * 10) // Cost + waste penalty
    });
  });

  // Sort by priority (lower is better)
  return configurations.sort((a, b) => a.priority - b.priority);
}
```

### Table Combination Generator

```typescript
function generateTableCombinations(
  tables: EditableItem[],
  peopleCount: number
): TableCombination[] {
  const combinations: TableCombination[] = [];

  // Recursive function to generate combinations
  function generateCombinations(
    currentCombination: TableCombination,
    remainingTables: EditableItem[],
    remainingPeople: number
  ) {
    if (remainingPeople <= 0) {
      combinations.push([...currentCombination]);
      return;
    }

    if (remainingTables.length === 0) {
      return;
    }

    const currentTable = remainingTables[0];
    const maxTables = Math.min(
      currentTable.maxQuantity,
      Math.ceil(remainingPeople / currentTable.minPersons)
    );

    for (let quantity = 0; quantity <= maxTables; quantity++) {
      if (quantity === 0) {
        // Skip this table type
        generateCombinations(
          currentCombination,
          remainingTables.slice(1),
          remainingPeople
        );
      } else {
        const tableCapacity = quantity * currentTable.maxPersons;
        if (tableCapacity >= remainingPeople) {
          const newCombination = [...currentCombination, {
            ...currentTable,
            quantity,
            avgGuestsPerTable: Math.ceil(remainingPeople / quantity)
          }];
          combinations.push(newCombination);
        } else {
          const newCombination = [...currentCombination, {
            ...currentTable,
            quantity,
            avgGuestsPerTable: currentTable.maxPersons
          }];
          generateCombinations(
            newCombination,
            remainingTables.slice(1),
            remainingPeople - tableCapacity
          );
        }
      }
    }
  }

  generateCombinations([], tables, peopleCount);
  return combinations;
}
```

---

## ✅ Validation System

### Table Selection Validation

```typescript
export function validateTableSelection(
  tables: EditableItem[],
  peopleCount: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if any tables are selected
  const selectedTables = tables.filter(t => t.quantity > 0);
  if (selectedTables.length === 0) {
    errors.push("No tables selected");
    return { isValid: false, errors, warnings };
  }

  // Check total capacity
  const totalCapacity = selectedTables.reduce((sum, table) => {
    return sum + (table.maxPersons * table.quantity);
  }, 0);

  const minCapacity = selectedTables.reduce((sum, table) => {
    return sum + (table.minPersons * table.quantity);
  }, 0);

  if (peopleCount < minCapacity) {
    errors.push(`Not enough people for minimum table capacity (${minCapacity} required)`);
  }

  if (peopleCount > totalCapacity) {
    errors.push(`Too many people for selected tables (${totalCapacity} maximum)`);
  }

  // Check individual table constraints
  selectedTables.forEach(table => {
    if (table.quantity > table.maxQuantity) {
      errors.push(`Cannot select ${table.quantity} ${table.title} tables (maximum ${table.maxQuantity})`);
    }
  });

  // Warnings for inefficient configurations
  if (totalCapacity > peopleCount * 1.5) {
    warnings.push("Selected tables have significant unused capacity");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Guest Allocation Validation

```typescript
export function validateGuestAllocation(
  tables: TableAllocationData[],
  totalGuests: number
): AllocationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalAllocated = 0;

  tables.forEach(table => {
    if (!table.allocation || table.allocation.length !== table.quantity) {
      errors.push(`${table.title} needs allocation for ${table.quantity} table${table.quantity > 1 ? 's' : ''}`);
      return;
    }

    table.allocation.forEach((guestCount, index) => {
      if (guestCount < table.minPersons) {
        errors.push(`${table.title} Table ${index + 1}: minimum ${table.minPersons} guests required (currently ${guestCount})`);
      }
      
      if (guestCount > table.maxPersons) {
        errors.push(`${table.title} Table ${index + 1}: maximum ${table.maxPersons} guests allowed (currently ${guestCount})`);
      }
      
      totalAllocated += guestCount;
    });
  });

  // Check total allocation
  if (totalAllocated !== totalGuests) {
    const difference = totalGuests - totalAllocated;
    if (difference > 0) {
      errors.push(`${difference} more guest${difference > 1 ? 's' : ''} need to be allocated`);
    } else {
      errors.push(`${Math.abs(difference)} too many guests allocated`);
    }
  }

  // Warnings for inefficient allocation
  const totalCapacity = tables.reduce((sum, table) => {
    return sum + (table.maxPersons * table.quantity);
  }, 0);

  if (totalCapacity > totalGuests * 1.3) {
    warnings.push("Significant unused table capacity");
  }

  return {
    isValid: errors.length === 0,
    totalAllocated,
    totalRequired: totalGuests,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
```

---

## ⚡ Performance Considerations

### Optimization Strategies

1. **Memoization**: Cache expensive calculations
```typescript
const recommendations = useMemo(() => {
  return generateTableRecommendations(tables, peopleCount);
}, [tables, peopleCount]);
```

2. **Lazy Loading**: Load table data on demand
```typescript
const { data: tableData } = useQuery({
  queryKey: ['table-data', eventSlug, date],
  queryFn: () => fetchTableData(eventSlug, date),
  enabled: !!eventSlug && !!date
});
```

3. **Debounced Inputs**: Reduce API calls
```typescript
const debouncedPeopleCount = useDebounce(peopleCount, 300);
```

4. **Virtual Scrolling**: Handle large table lists
```typescript
const VirtualizedTableList = ({ tables }) => {
  return (
    <FixedSizeList
      height={400}
      itemCount={tables.length}
      itemSize={120}
      itemData={tables}
    >
      {TableRow}
    </FixedSizeList>
  );
};
```

### Memory Management

```typescript
// Cleanup allocations when component unmounts
useEffect(() => {
  return () => {
    // Clear any pending allocations
    setAllocations({});
  };
}, []);

// Optimize re-renders
const TableCard = React.memo(({ recommendation, onSelect }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.recommendation.id === nextProps.recommendation.id &&
         prevProps.recommendation.priority === nextProps.recommendation.priority;
});
```

---

## 🧪 Testing

### Unit Tests

```typescript
describe("Table Recommendation Engine", () => {
  test("generates perfect fit recommendations", () => {
    const tables = [
      { id: 1, minPersons: 4, maxPersons: 8, price: 50, quantity: 5 }
    ];
    const peopleCount = 6;
    
    const result = generateTableRecommendations(tables, peopleCount);
    
    expect(result.recommended).toHaveLength(1);
    expect(result.recommended[0].fit).toBe("perfect");
    expect(result.recommended[0].wastedSeats).toBe(2);
  });

  test("handles multiple table scenarios", () => {
    const tables = [
      { id: 1, minPersons: 4, maxPersons: 8, price: 50, quantity: 2 }
    ];
    const peopleCount = 20;
    
    const result = generateTableRecommendations(tables, peopleCount);
    
    expect(result.recommended[0].fit).toBe("multiple");
    expect(result.recommended[0].tablesNeeded).toBe(3);
  });
});

describe("Guest Allocation", () => {
  test("auto-arranges guests optimally", () => {
    const tables = [
      { id: 1, minPersons: 4, maxPersons: 8, quantity: 2 }
    ];
    const totalGuests = 12;
    
    const result = autoArrangeGuests(tables, totalGuests);
    
    expect(result[1]).toEqual([6, 6]); // Optimal distribution
  });

  test("validates allocation constraints", () => {
    const tables = [
      {
        tableId: 1,
        title: "Standard Table",
        minPersons: 4,
        maxPersons: 8,
        quantity: 2,
        allocation: [3, 5] // Invalid: 3 < minPersons
      }
    ];
    const totalGuests = 8;
    
    const result = validateAllocation(tables, totalGuests);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Standard Table Table 1: minimum 4 guests required (currently 3)");
  });
});
```

### Integration Tests

```typescript
describe("Table Booking Flow", () => {
  test("complete table booking process", async () => {
    // 1. Select tables
    const tableSelection = { id: 1, quantity: 2 };
    updateQuantity(eventSlug, date, "table", tableSelection.id, tableSelection.quantity);
    
    // 2. Allocate guests
    const allocation = { 1: [6, 4] };
    updateTableAllocation(eventSlug, date, 1, allocation[1]);
    
    // 3. Validate
    const validation = validateGuestAllocation(eventSlug, date);
    expect(validation.isValid).toBe(true);
    
    // 4. Checkout
    const checkoutData = transformCartToCheckout(eventSlug, editingData, apiCartData);
    const result = await processCheckout(checkoutData);
    
    expect(result.data.booking_id).toBeDefined();
  });
});
```

### E2E Tests

```typescript
describe("Table Selection E2E", () => {
  test("user can select and allocate tables", () => {
    cy.visit("/vendor/checkout");
    
    // Select table
    cy.get("[data-testid=table-recommendation]").first().click();
    cy.get("[data-testid=select-table-button]").click();
    
    // Open allocation modal
    cy.get("[data-testid=guest-allocation-button]").click();
    
    // Auto-arrange guests
    cy.get("[data-testid=auto-arrange-button]").click();
    cy.get("[data-testid=confirm-allocation]").click();
    
    // Verify allocation
    cy.get("[data-testid=allocation-summary]").should("contain", "12 guests allocated");
    
    // Proceed to checkout
    cy.get("[data-testid=checkout-button]").click();
    cy.url().should("include", "/payment");
  });
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Table Recommendations Not Showing

**Problem**: No table recommendations appear

**Solution**: Check table data and people count
```typescript
// Debug table data
console.log("Tables:", tables);
console.log("People Count:", peopleCount);

// Check if tables have valid capacity
tables.forEach(table => {
  const { minPersons, maxPersons } = parseTableCapacity(table);
  console.log(`${table.title}: ${minPersons}-${maxPersons} persons`);
});
```

#### 2. Guest Allocation Validation Fails

**Problem**: Cannot confirm allocation due to validation errors

**Solution**: Check allocation constraints
```typescript
const validation = validateGuestAllocation(eventSlug, date);
console.log("Validation errors:", validation.errors);
console.log("Current allocation:", dateData.tables.map(t => t.allocation));
```

#### 3. Auto-Arrangement Not Working

**Problem**: Auto-arrange button doesn't distribute guests properly

**Solution**: Check table constraints and guest count
```typescript
// Verify table constraints
const totalMinCapacity = tables.reduce((sum, t) => sum + t.minPersons, 0);
const totalMaxCapacity = tables.reduce((sum, t) => sum + t.maxPersons, 0);

console.log(`Guest count: ${totalGuests}`);
console.log(`Min capacity: ${totalMinCapacity}`);
console.log(`Max capacity: ${totalMaxCapacity}`);

if (totalGuests < totalMinCapacity) {
  console.warn("Not enough guests for minimum table capacity");
}
```

#### 4. Performance Issues with Large Table Lists

**Problem**: UI becomes slow with many table options

**Solution**: Implement virtualization and memoization
```typescript
// Use React.memo for table cards
const TableCard = React.memo(({ recommendation }) => {
  // Component implementation
});

// Implement virtual scrolling for large lists
const VirtualizedTableList = ({ tables }) => {
  return (
    <FixedSizeList
      height={400}
      itemCount={tables.length}
      itemSize={120}
    >
      {({ index, style }) => (
        <div style={style}>
          <TableCard recommendation={tables[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### Debug Tools

#### 1. Table Recommendation Debugger

```typescript
// Add to development environment
if (process.env.NODE_ENV === "development") {
  window.tableDebug = {
    generateRecommendations: (tables, peopleCount) => {
      return generateTableRecommendations(tables, peopleCount);
    },
    autoArrangeGuests: (tables, totalGuests) => {
      return autoArrangeGuests(tables, totalGuests);
    },
    validateAllocation: (tables, totalGuests) => {
      return validateAllocation(tables, totalGuests);
    }
  };
}
```

#### 2. Allocation State Inspector

```typescript
// Add to GuestAllocationModal
useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    console.log("Current allocations:", allocations);
    console.log("Selected tables:", selectedTables);
    console.log("Total guests:", totalGuests);
  }
}, [allocations, selectedTables, totalGuests]);
```

---

## 📚 Additional Resources

### Related Documentation

- [Checkout System Documentation](./CHECKOUT_SYSTEM_DOCUMENTATION.md)
- [Payment System Documentation](./PAYMENT_SYSTEM_DOCUMENTATION.md)
- [API Documentation](./API_DOCUMENTATION.md)

### Code Examples

- [Table Recommendations Example](./examples/table-recommendations.ts)
- [Guest Allocation Example](./examples/guest-allocation.ts)
- [Validation Examples](./examples/validation.ts)

### Best Practices

1. **Always validate table constraints before allocation**
2. **Use memoization for expensive calculations**
3. **Implement proper error boundaries**
4. **Test edge cases thoroughly**
5. **Optimize for large datasets**

---

*Last Updated: September 2025*
*Version: 2.0.0*
