import { useState, useEffect } from 'react';
import { FileText, Save, Loader2, Eye, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { KeyTermCheckbox, InitialsSection } from '@/hooks/useAgreement';

interface AgreementTemplate {
  id: string;
  template_id: string;
  name: string;
  version: string;
  is_active: boolean;
  content: string;
  key_terms: KeyTermCheckbox[];
  initials_sections: InitialsSection[];
  created_at: string;
  updated_at: string;
}

export function AgreementTemplateWidget() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [content, setContent] = useState('');
  const [keyTerms, setKeyTerms] = useState<KeyTermCheckbox[]>([]);
  const [initialsSections, setInitialsSections] = useState<InitialsSection[]>([]);
  
  // Fetch template
  const { data: template, isLoading } = useQuery({
    queryKey: ['admin-agreement-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agreement_templates')
        .select('*')
        .eq('template_id', 'alpha-agent-v4')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        key_terms: Array.isArray(data.key_terms) ? (data.key_terms as unknown as KeyTermCheckbox[]) : [],
        initials_sections: Array.isArray(data.initials_sections) ? (data.initials_sections as unknown as InitialsSection[]) : [],
      } as AgreementTemplate;
    },
  });
  
  // Initialize form when template loads
  useEffect(() => {
    if (template) {
      setName(template.name);
      setVersion(template.version);
      setContent(template.content);
      setKeyTerms(template.key_terms);
      setInitialsSections(template.initials_sections);
    }
  }, [template]);
  
  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async () => {
      if (!template?.id) throw new Error('No template found');
      
      const { error } = await supabase
        .from('agreement_templates')
        .update({
          name,
          version,
          content,
          key_terms: keyTerms as any,
          initials_sections: initialsSections as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agreement-template'] });
      queryClient.invalidateQueries({ queryKey: ['agreement-template'] });
      toast.success('Agreement template saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    },
  });
  
  const handleKeyTermChange = (index: number, field: keyof KeyTermCheckbox, value: string | boolean) => {
    setKeyTerms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  
  const handleInitialsSectionChange = (index: number, field: keyof InitialsSection, value: string | boolean) => {
    setInitialsSections(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  
  // Render preview with sample data
  const previewContent = content
    .replace(/\{\{contact\.name\}\}/g, 'John Smith')
    .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{current_timestamp\}\}/g, new Date().toLocaleString())
    .replace(/\{\{ip_address\}\}/g, '192.168.1.1')
    .replace(/\{\{user_agent\}\}/g, 'Chrome/120.0.0.0');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Agreement Template</CardTitle>
                  <CardDescription>Manage the service agreement template and key terms</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {template?.version || 'v4.0'}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digital Marketing Management Agreement"
                />
              </div>
              <div>
                <Label htmlFor="templateVersion">Version</Label>
                <Input
                  id="templateVersion"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v4.0"
                />
              </div>
            </div>
            
            {/* Placeholder Tokens Reference */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Available Placeholders:</p>
              <div className="flex flex-wrap gap-2">
                {['{{contact.name}}', '{{current_date}}', '{{current_timestamp}}', '{{ip_address}}', '{{user_agent}}'].map((token) => (
                  <Badge key={token} variant="secondary" className="text-xs font-mono">
                    {token}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Contract Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="contractContent">Contract Content</Label>
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Agreement Preview</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] border rounded-md p-4 bg-muted/30">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {previewContent}
                      </pre>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
              <Textarea
                id="contractContent"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the full contract text..."
                className="min-h-[300px] font-mono text-xs"
              />
            </div>
            
            <Separator />
            
            {/* Key Terms Configuration */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <Label className="text-base font-semibold">Key Financial Terms (10 Required Checkboxes)</Label>
              </div>
              
              <div className="space-y-4">
                {keyTerms.map((term, index) => (
                  <div key={term.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{term.id}</span>
                    </div>
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={term.label}
                        onChange={(e) => handleKeyTermChange(index, 'label', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={term.description}
                        onChange={(e) => handleKeyTermChange(index, 'description', e.target.value)}
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Initials Sections */}
            <div>
              <Label className="text-base font-semibold mb-4 block">Required Initials Sections</Label>
              
              <div className="space-y-4">
                {initialsSections.map((section, index) => (
                  <div key={section.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Initials {index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{section.id}</span>
                    </div>
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Textarea
                        value={section.label}
                        onChange={(e) => handleInitialsSectionChange(index, 'label', e.target.value)}
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={() => updateTemplate.mutate()}
                disabled={updateTemplate.isPending}
              >
                {updateTemplate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
