"use client";

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
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

const DragIntentContext = createContext<{
  onStart: () => void;
  onEnd: () => void;
} | null>(null);

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
  const dragActiveRef = useRef(false);
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

  const setDragging = (dragging: boolean) => {
    if (disabled) return;
    onDraggingChange?.(dragging);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => {
        dragActiveRef.current = true;
        setDragging(true);
      }}
      onDragEnd={(event) => {
        dragActiveRef.current = false;
        handleDragEnd(event);
        setDragging(false);
      }}
      onDragCancel={() => {
        dragActiveRef.current = false;
        setDragging(false);
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="mt-4">
          <DragIntentContext.Provider
            value={{
              onStart: () => setDragging(true),
              onEnd: () => {
                requestAnimationFrame(() => {
                  if (!dragActiveRef.current) setDragging(false);
                });
              },
            }}
          >
            {children}
          </DragIntentContext.Provider>
        </div>
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
  const dragIntent = useContext(DragIntentContext);
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

  const { onPointerDown, onPointerUp, onKeyDown, ...restListeners } =
    listeners ?? {};

  const handle = disabled ? null : (
    <button
      type="button"
      className="touch-none cursor-grab rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
      aria-label="Drag to change the order this menu appears on your event page"
      {...attributes}
      {...restListeners}
      onPointerDown={(event) => {
        dragIntent?.onStart();
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        dragIntent?.onEnd();
      }}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          dragIntent?.onStart();
        }
        onKeyDown?.(event);
      }}
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
      className={cn(isDragging && "relative z-10 opacity-80 shadow-md")}
    >
      {children(handle)}
    </div>
  );
}
