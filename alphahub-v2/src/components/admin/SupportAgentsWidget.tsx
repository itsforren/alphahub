import { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSupportAgents, useCreateSupportAgent, useUpdateSupportAgent, useDeleteSupportAgent, SupportAgent } from '@/hooks/useSupportAgents';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'billing', label: 'Billing' },
  { id: 'tech', label: 'Technical' },
  { id: 'leads', label: 'Leads' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'other', label: 'Other' },
];

export function SupportAgentsWidget() {
  const { data: agents, isLoading } = useSupportAgents();
  const createAgent = useCreateSupportAgent();
  const updateAgent = useUpdateSupportAgent();
  const deleteAgent = useDeleteSupportAgent();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    categories: [] as string[],
    is_default: false,
  });

  const handleAdd = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      await createAgent.mutateAsync({
        ...formData,
        user_id: null,
        is_active: true,
      });
      toast.success('Support agent added');
      setIsAdding(false);
      setFormData({ name: '', email: '', categories: [], is_default: false });
    } catch (error) {
      toast.error('Failed to add support agent');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateAgent.mutateAsync({ id, ...formData });
      toast.success('Support agent updated');
      setEditingId(null);
    } catch (error) {
      toast.error('Failed to update support agent');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this support agent?')) return;

    try {
      await deleteAgent.mutateAsync(id);
      toast.success('Support agent deleted');
    } catch (error) {
      toast.error('Failed to delete support agent');
    }
  };

  const handleToggleActive = async (agent: SupportAgent) => {
    try {
      await updateAgent.mutateAsync({ id: agent.id, is_active: !agent.is_active });
      toast.success(agent.is_active ? 'Agent deactivated' : 'Agent activated');
    } catch (error) {
      toast.error('Failed to update agent status');
    }
  };

  const startEditing = (agent: SupportAgent) => {
    setEditingId(agent.id);
    setFormData({
      name: agent.name,
      email: agent.email,
      categories: Array.isArray(agent.categories) ? agent.categories : [],
      is_default: agent.is_default,
    });
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Support Agents
            </CardTitle>
            <CardDescription>
              Configure agents who receive and handle support tickets
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="w-4 h-4 mr-1" />
            Add Agent
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Agent Form */}
        {isAdding && (
          <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Tech Support"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                  placeholder="tech@alphaagent.io"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Categories</Label>
              <div className="flex flex-wrap gap-3">
                {CATEGORIES.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.categories.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_default: checked }))}
              />
              <Label>Default agent (fallback for unmatched categories)</Label>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={createAgent.isPending}>
                {createAgent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Agents List */}
        {agents?.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No support agents configured</p>
            <p className="text-sm">Add an agent to enable ticket auto-assignment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents?.map((agent) => (
              <div 
                key={agent.id} 
                className="p-4 border border-border rounded-lg flex items-start justify-between gap-4"
              >
                {editingId === agent.id ? (
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                      />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {CATEGORIES.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={formData.categories.includes(cat.id)}
                            onCheckedChange={() => toggleCategory(cat.id)}
                          />
                          <span className="text-sm">{cat.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_default}
                          onCheckedChange={(checked) => setFormData(f => ({ ...f, is_default: checked }))}
                        />
                        <Label>Default agent</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(agent.id)} disabled={updateAgent.isPending}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{agent.name}</span>
                        {agent.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        {!agent.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{agent.email}</p>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(agent.categories) ? agent.categories : []).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {CATEGORIES.find(c => c.id === cat)?.label || cat}
                          </Badge>
                        ))}
                        {(!agent.categories || (Array.isArray(agent.categories) && agent.categories.length === 0)) && (
                          <span className="text-xs text-muted-foreground">No categories assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={agent.is_active}
                        onCheckedChange={() => handleToggleActive(agent)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => startEditing(agent)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(agent.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
