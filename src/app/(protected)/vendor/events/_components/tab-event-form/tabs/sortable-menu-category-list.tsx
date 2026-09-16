"use client";

import { useRef, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type SortableMenuCategoryListProps = {
  ids: string[];
  disabled?: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
  children: ReactNode;
};

export function SortableMenuCategoryList({
  ids,
  disabled = false,
  onReorder,
  onDraggingChange,
  children,
}: SortableMenuCategoryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    onReorder(fromIndex, toIndex);
  };

  // Only collapse menus once a real drag has started. Collapsing on pointer
  // down made the last category jump (open content above it shrinks) so
  // pointerup never fired and the accordion stayed locked shut.
  const setDragging = (dragging: boolean) => {
    if (dragging && disabled) return;
    onDraggingChange?.(dragging);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => setDragging(true)}
      onDragEnd={(event) => {
        handleDragEnd(event);
        setDragging(false);
      }}
      onDragCancel={() => setDragging(false)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="mt-4">{children}</div>
      </SortableContext>
    </DndContext>
  );
}

type SortableMenuCategoryItemProps = {
  id: string;
  disabled?: boolean;
  children: (handle: ReactNode) => ReactNode;
};

export function SortableMenuCategoryItem({
  id,
  disabled = false,
  children,
}: SortableMenuCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const handle = disabled ? null : (
    <button
      type="button"
      className="touch-none cursor-grab rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
      aria-label="Drag to change the order this menu appears on your event page"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "relative z-0",
        isDragging && "z-10 opacity-80 shadow-md",
      )}
    >
      {children(handle)}
    </div>
  );
}
