import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast, format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Tag,
  User,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TicketWithDetails {
  id: string;
  client_id: string;
  ticket_number: number | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_at: string | null;
  sla_deadline: string | null;
  due_date: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
  last_reply_at: string | null;
  ticket_type?: string;
  labels?: string[];
  client?: { id: string; name: string; email: string; profile_image_url: string | null };
  assignee?: { id: string; name: string; email: string; avatar_url: string | null };
}

interface TicketKanbanBoardProps {
  tickets: TicketWithDetails[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onAssign: (ticketId: string, assigneeId: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTicketNumber(n: number | null) {
  return n ? `TKT-${n.toString().padStart(4, '0')}` : 'TKT-????';
}

function getInitials(name?: string | null): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return '??';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Column configuration
// ---------------------------------------------------------------------------

interface ColumnConfig {
  id: string;
  label: string;
  color: string;       // dot / accent colour
  bgAccent: string;    // lighter bg used on hover/highlight
}

const COLUMNS: ColumnConfig[] = [
  { id: 'open',        label: 'Open',        color: '#3b82f6', bgAccent: 'bg-blue-500/10'   },
  { id: 'in_progress', label: 'In Progress', color: '#eab308', bgAccent: 'bg-yellow-500/10' },
  { id: 'waiting',     label: 'Waiting',     color: '#a855f7', bgAccent: 'bg-purple-500/10' },
  { id: 'resolved',    label: 'Resolved',    color: '#22c55e', bgAccent: 'bg-green-500/10'  },
];

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-500/15 text-red-400 border-red-500/25' },
  high:     { label: 'High',     className: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  medium:   { label: 'Medium',   className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  low:      { label: 'Low',      className: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
};

// ---------------------------------------------------------------------------
// SortableTicketCard
// ---------------------------------------------------------------------------

interface SortableTicketCardProps {
  ticket: TicketWithDetails;
}

function SortableTicketCard({ ticket }: SortableTicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-lg border border-white/10 bg-card/80 p-3 space-y-2 cursor-grab active:cursor-grabbing',
        'hover:border-primary/30 transition-all duration-200',
        isDragging && 'opacity-50 scale-105 rotate-2 shadow-2xl',
      )}
    >
      <TicketCardContent ticket={ticket} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TicketCardContent (shared between card & drag overlay)
// ---------------------------------------------------------------------------

function TicketCardContent({ ticket }: { ticket: TicketWithDetails }) {
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.medium;

  const slaBreached = ticket.sla_deadline && isPast(new Date(ticket.sla_deadline));
  const slaUrgent =
    ticket.sla_deadline &&
    !slaBreached &&
    new Date(ticket.sla_deadline).getTime() - Date.now() < 2 * 60 * 60 * 1000; // < 2 hrs

  return (
    <>
      {/* Row 1 — ticket number + priority */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted-foreground">
          {formatTicketNumber(ticket.ticket_number)}
        </span>
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', priorityCfg.className)}>
          {priorityCfg.label}
        </Badge>
      </div>

      {/* Row 2 — subject */}
      <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
        {ticket.subject}
      </p>

      {/* Row 3 — category + labels */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
          <Tag className="w-3 h-3" />
          {ticket.category}
        </Badge>
        {ticket.ticket_type && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-white/10">
            {ticket.ticket_type}
          </Badge>
        )}
      </div>

      {/* Row 4 — client */}
      {ticket.client && (
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            {ticket.client.profile_image_url ? (
              <AvatarImage src={ticket.client.profile_image_url} alt={ticket.client.name} />
            ) : null}
            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
              {getInitials(ticket.client.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">{ticket.client.name}</span>
        </div>
      )}

      {/* Row 5 — SLA / due date / assignee */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
        {/* SLA countdown */}
        {ticket.sla_deadline && (
          <div
            className={cn(
              'flex items-center gap-1 text-[10px]',
              slaBreached
                ? 'text-red-400'
                : slaUrgent
                  ? 'text-orange-400'
                  : 'text-muted-foreground',
            )}
          >
            {slaBreached ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span>
              {slaBreached
                ? `SLA breached ${formatDistanceToNow(new Date(ticket.sla_deadline), { addSuffix: true })}`
                : `SLA ${formatDistanceToNow(new Date(ticket.sla_deadline), { addSuffix: true })}`}
            </span>
          </div>
        )}

        {/* Due date (only shown if no SLA) */}
        {!ticket.sla_deadline && ticket.due_date && (
          <div
            className={cn(
              'flex items-center gap-1 text-[10px]',
              isPast(new Date(ticket.due_date)) ? 'text-red-400' : 'text-muted-foreground',
            )}
          >
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(ticket.due_date), 'MMM d')}</span>
          </div>
        )}

        {/* Spacer when neither SLA nor due date */}
        {!ticket.sla_deadline && !ticket.due_date && <span />}

        {/* Assignee avatar */}
        {ticket.assignee ? (
          <Avatar className="h-5 w-5">
            {ticket.assignee.avatar_url ? (
              <AvatarImage src={ticket.assignee.avatar_url} alt={ticket.assignee.name} />
            ) : null}
            <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
              {getInitials(ticket.assignee.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-5 w-5 rounded-full border border-dashed border-white/20 flex items-center justify-center">
            <User className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// DroppableColumn
// ---------------------------------------------------------------------------

interface DroppableColumnProps {
  column: ColumnConfig;
  tickets: TicketWithDetails[];
}

function DroppableColumn({ column, tickets }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 bg-muted/30 rounded-xl border border-white/5 flex flex-col max-h-full transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      {/* Column header */}
      <div className="p-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
            <h3 className="text-sm font-medium">{column.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tickets.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 pt-0 flex-1 overflow-y-auto space-y-2">
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <SortableTicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No tickets</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TicketKanbanBoard (main export)
// ---------------------------------------------------------------------------

export function TicketKanbanBoard({ tickets, onStatusChange, onAssign }: TicketKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Group tickets by status into each column
  const columnTickets: Record<string, TicketWithDetails[]> = {};
  for (const col of COLUMNS) {
    columnTickets[col.id] = tickets.filter((t) => t.status === col.id);
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const ticketId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetStatus: string | null = null;

    // Check if dropped directly on a column
    const droppedOnColumn = COLUMNS.find((c) => c.id === overId);
    if (droppedOnColumn) {
      targetStatus = droppedOnColumn.id;
    } else {
      // Dropped on a ticket card — find which column that card lives in
      for (const col of COLUMNS) {
        if (columnTickets[col.id].some((t) => t.id === overId)) {
          targetStatus = col.id;
          break;
        }
      }
    }

    if (!targetStatus) return;

    // Find current status of the dragged ticket
    const draggedTicket = tickets.find((t) => t.id === ticketId);
    if (!draggedTicket) return;

    // Only fire if actually moving to a different column
    if (draggedTicket.status !== targetStatus) {
      onStatusChange(ticketId, targetStatus);
    }
  };

  const activeTicket = activeId ? tickets.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)]">
        {COLUMNS.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            tickets={columnTickets[column.id]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <div className="w-72 opacity-90 rotate-3 rounded-lg border border-white/10 bg-card p-3 space-y-2 shadow-2xl">
            <TicketCardContent ticket={activeTicket} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
