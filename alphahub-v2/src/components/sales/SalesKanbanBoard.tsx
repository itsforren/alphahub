import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
  DroppableContainer,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useSalesPipeline, useUpdateProspectStage, useUpdateProspect, PipelineStage, ProspectWithAttribution, Partner } from '@/hooks/useSalesPipeline';
import { ProspectCard } from './ProspectCard';
import { ProspectDetailModal } from './ProspectDetailModal';
import { SavedViewsBar, SavedView, SAVED_VIEWS } from './SavedViewsBar';
import { ClosedWonModal, ClosedWonData } from './ClosedWonModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DroppableColumnProps {
  stage: PipelineStage;
  prospects: ProspectWithAttribution[];
  onProspectClick: (id: string) => void;
}

function DroppableColumn({ stage, prospects, onProspectClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  // Count overdue in this column
  const overdueCount = prospects.filter(
    (p) => p.next_action_due_at && new Date(p.next_action_due_at) < new Date()
  ).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-72 bg-muted/30 rounded-xl border border-white/5 flex flex-col max-h-full transition-colors",
        isOver && "border-primary/50 bg-primary/5"
      )}
    >
      <CardHeader className="p-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stage.color }}
            />
            <CardTitle className="text-sm font-medium">{stage.stage_name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                {overdueCount} overdue
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {prospects.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 flex-1 overflow-y-auto space-y-2">
        <SortableContext items={prospects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {prospects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              onClick={() => onProspectClick(prospect.id)}
            />
          ))}
        </SortableContext>
        {prospects.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No prospects
          </div>
        )}
      </CardContent>
    </div>
  );
}

interface PartnerFilterProps {
  partners: Partner[];
  selectedPartnerId: string | null;
  onSelect: (partnerId: string | null) => void;
}

function PartnerFilter({ partners, selectedPartnerId, onSelect }: PartnerFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Partner:</span>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
          selectedPartnerId === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All
      </button>
      <button
        onClick={() => onSelect("direct")}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
          selectedPartnerId === "direct"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        Direct
      </button>
      {partners.map((partner) => (
        <button
          key={partner.id}
          onClick={() => onSelect(partner.id)}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
            selectedPartnerId === partner.id
              ? "text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          style={selectedPartnerId === partner.id ? { backgroundColor: partner.color } : undefined}
        >
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: partner.color }}
          />
          {partner.name}
        </button>
      ))}
    </div>
  );
}

export function SalesKanbanBoard() {
  const { data, isLoading, error } = useSalesPipeline();
  const updateStage = useUpdateProspectStage();
  const updateProspect = useUpdateProspect();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState<string | null>(null);
  const [savedView, setSavedView] = useState<SavedView>('all');

  // Closed Won modal state
  const [pendingClosedWon, setPendingClosedWon] = useState<{
    prospectId: string;
    newStageId: string;
    oldStageId: string;
  } | null>(null);
  const [closedWonSaving, setClosedWonSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Custom collision detection that prioritizes columns over cards
  const customCollisionDetection: CollisionDetection = (args) => {
    // First check for droppable columns
    const droppableContainers = args.droppableContainers.filter((container) => {
      // Check if this is a stage column (not a card)
      return data?.stages.some(s => s.id === container.id);
    });

    // Use pointerWithin for columns - gives us the column the pointer is in
    const pointerCollisions = pointerWithin({
      ...args,
      droppableContainers,
    });

    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // Fallback to rectIntersection for any container
    return rectIntersection(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !data) return;

    const prospectId = active.id as string;
    const overId = over.id as string;

    // Determine the target stage ID - prioritize column detection
    let targetStageId: string | null = null;
    
    // Check if dropped directly on a stage column
    const droppedOnStage = data.stages.find(s => s.id === overId);
    if (droppedOnStage) {
      targetStageId = droppedOnStage.id;
    } else {
      // Dropped on a card - find which column that card belongs to using filtered pipeline
      for (const stage of data.stages) {
        const stageProspects = filteredPipeline[stage.id] || [];
        if (stageProspects.some(p => p.id === overId)) {
          targetStageId = stage.id;
          break;
        }
      }
    }

    if (!targetStageId) return;

    // Find the prospect's current stage
    let oldStageId: string | null = null;
    const draggedProspect = data.allProspects.find(p => p.id === prospectId);
    if (draggedProspect) {
      oldStageId = draggedProspect.pipeline_stage_id;
      // If no stage, use first stage
      if (!oldStageId) {
        const firstStage = data.stages.find(s => s.stage_key === 'new_lead' || s.stage_key === 'applied');
        oldStageId = firstStage?.id || null;
      }
    }

    // Only update if moving to a different stage
    if (oldStageId && targetStageId !== oldStageId) {
      // Check if target stage is "closed_won"
      const targetStage = data.stages.find(s => s.id === targetStageId);
      if (targetStage?.stage_key === 'closed_won') {
        // Show the Closed Won modal instead of moving immediately
        setPendingClosedWon({ prospectId, newStageId: targetStageId, oldStageId });
      } else {
        updateStage.mutate({ prospectId, newStageId: targetStageId, oldStageId });
      }
    }
  };

  // Handler for the Closed Won modal confirmation
  const handleClosedWonConfirm = async (formData: ClosedWonData) => {
    if (!pendingClosedWon) return;
    setClosedWonSaving(true);
    try {
      // First save the closed-won data
      await updateProspect.mutateAsync({
        prospectId: pendingClosedWon.prospectId,
        updates: {
          management_fee: formData.managementFee,
          deposit_type: formData.depositType,
          deposit_amount: formData.depositAmount,
          ad_spend_budget: formData.adSpendBudget,
          billing_frequency: formData.billingFrequency,
          payment_status: 'paid',
          payment_amount: formData.depositAmount,
        } as any,
      });

      // Then move to closed_won stage (this sets next_action to schedule_onboarding)
      await updateStage.mutateAsync({
        prospectId: pendingClosedWon.prospectId,
        newStageId: pendingClosedWon.newStageId,
        oldStageId: pendingClosedWon.oldStageId,
      });

      toast.success('Deal closed! Schedule Onboarding is now the next action.');
      setPendingClosedWon(null);
    } catch (err) {
      console.error('Failed to save closed won data:', err);
      toast.error('Failed to save deal details');
    } finally {
      setClosedWonSaving(false);
    }
  };

  // Apply saved view filter to all prospects first
  const getViewFilteredProspects = () => {
    if (!data) return [];
    const viewConfig = SAVED_VIEWS[savedView];
    return viewConfig.filter(data.allProspects);
  };

  // Then apply partner filter
  const getFilteredPipeline = () => {
    if (!data) return {};

    const viewFiltered = getViewFilteredProspects();
    
    // Group by stage
    const grouped: Record<string, ProspectWithAttribution[]> = {};
    for (const stage of data.stages) {
      let stageProspects = viewFiltered.filter(p => p.pipeline_stage_id === stage.id);
      
      // Apply partner filter
      if (partnerFilter === "direct") {
        stageProspects = stageProspects.filter(p => !p.partner_id);
      } else if (partnerFilter) {
        stageProspects = stageProspects.filter(p => p.partner_id === partnerFilter);
      }
      
      grouped[stage.id] = stageProspects;
    }

    // Handle no-stage prospects
    const firstStage = data.stages.find(s => s.stage_key === 'new_lead' || s.stage_key === 'applied');
    if (firstStage) {
      let noStageProspects = viewFiltered.filter(p => !p.pipeline_stage_id);
      if (partnerFilter === "direct") {
        noStageProspects = noStageProspects.filter(p => !p.partner_id);
      } else if (partnerFilter) {
        noStageProspects = noStageProspects.filter(p => p.partner_id === partnerFilter);
      }
      grouped[firstStage.id] = [...(grouped[firstStage.id] || []), ...noStageProspects];
    }

    return grouped;
  };

  const filteredPipeline = getFilteredPipeline();

  const activeProspect = activeId && data 
    ? data.allProspects.find(p => p.id === activeId) 
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load sales pipeline
      </div>
    );
  }

  return (
    <>
      {/* Saved Views Bar */}
      <SavedViewsBar
        selectedView={savedView}
        onSelectView={setSavedView}
        prospects={data.allProspects}
      />

      {/* Partner Filter */}
      <div className="mb-4">
        <PartnerFilter
          partners={data.partners || []}
          selectedPartnerId={partnerFilter}
          onSelect={setPartnerFilter}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)]">
          {data.stages.map((stage) => (
            <DroppableColumn
              key={stage.id}
              stage={stage}
              prospects={filteredPipeline[stage.id] || []}
              onProspectClick={setSelectedProspectId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProspect && (
            <div className="w-72 opacity-90 rotate-3">
              <ProspectCard prospect={activeProspect} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <ProspectDetailModal
        prospectId={selectedProspectId}
        open={!!selectedProspectId}
        onClose={() => setSelectedProspectId(null)}
      />

      {/* Closed Won Modal */}
      <ClosedWonModal
        open={!!pendingClosedWon}
        onClose={() => setPendingClosedWon(null)}
        onConfirm={handleClosedWonConfirm}
        prospectName={
          pendingClosedWon
            ? data.allProspects.find(p => p.id === pendingClosedWon.prospectId)?.name || 'Prospect'
            : ''
        }
        isLoading={closedWonSaving}
      />
    </>
  );
}
