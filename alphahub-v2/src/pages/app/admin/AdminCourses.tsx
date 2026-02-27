import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen, Loader2, GripVertical, Video, Eye, EyeOff, Upload, FileText, X, BarChart3, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { CourseAnalytics } from '@/components/courses/CourseAnalytics';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LessonResource {
  title: string;
  url: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  bunny_embed_url: string | null;
  is_preview: boolean;
  resources: LessonResource[];
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: string;
  cover_image_url: string | null;
  modules: Module[];
}

// Sortable Lesson Item
function SortableLessonItem({ lesson, onEdit, onDelete }: { lesson: Lesson; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab hover:bg-secondary/50 p-1 rounded">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <Video className="w-4 h-4 text-primary" />
        <span className="text-sm">{lesson.title}</span>
        {lesson.is_preview && <Badge variant="outline" className="text-xs">Preview</Badge>}
        {lesson.resources?.length > 0 && <Badge variant="secondary" className="text-xs">{lesson.resources.length} file(s)</Badge>}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Sortable Module Item
function SortableModuleItem({ module, children, onEdit, onDelete }: { module: Module; children: React.ReactNode; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <AccordionItem ref={setNodeRef} style={style} value={module.id} className="border rounded-lg bg-secondary/20">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-2 flex-1">
          <button {...attributes} {...listeners} className="cursor-grab hover:bg-secondary/50 p-1 rounded" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <span>{module.title}</span>
          <span className="text-xs text-muted-foreground">({module.lessons.length} lessons)</span>
          <div className="ml-auto flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function AdminCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  
  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<{ courseId: string; module: Module | null }>({ courseId: '', module: null });
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson | null }>({ moduleId: '', lesson: null });
  const [formData, setFormData] = useState({ title: '', description: '', cover_image_url: '' });
  const [moduleFormData, setModuleFormData] = useState({ title: '' });
  const [lessonFormData, setLessonFormData] = useState({ title: '', description: '', bunny_embed_url: '', is_preview: false, resources: [] as LessonResource[] });
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select(`
          id, title, description, status, cover_image_url,
          modules (
            id, title, order_index,
            lessons (id, title, description, order_index, bunny_embed_url, is_preview, resources)
          )
        `)
        .order('created_at', { ascending: false });

      if (data) {
        const sorted = data.map((c: any) => ({
          ...c,
          modules: (c.modules || [])
            .sort((a: Module, b: Module) => a.order_index - b.order_index)
            .map((m: any) => ({
              ...m,
              lessons: (m.lessons || []).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index).map((l: any) => ({
                ...l,
                resources: Array.isArray(l.resources) ? l.resources : []
              }))
            }))
        }));
        setCourses(sorted);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCourseDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({ title: course.title, description: course.description || '', cover_image_url: course.cover_image_url || '' });
    } else {
      setEditingCourse(null);
      setFormData({ title: '', description: '', cover_image_url: '' });
    }
    setCourseDialogOpen(true);
  };

  const openModuleDialog = (courseId: string, module?: Module) => {
    setEditingModule({ courseId, module: module || null });
    setModuleFormData({ title: module?.title || '' });
    setModuleDialogOpen(true);
  };

  const openLessonDialog = (moduleId: string, lesson?: Lesson) => {
    setEditingLesson({ moduleId, lesson: lesson || null });
    setLessonFormData({
      title: lesson?.title || '',
      description: lesson?.description || '',
      bunny_embed_url: lesson?.bunny_embed_url || '',
      is_preview: lesson?.is_preview || false,
      resources: lesson?.resources || []
    });
    setLessonDialogOpen(true);
  };

  const saveCourse = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({ title: formData.title, description: formData.description, cover_image_url: formData.cover_image_url || null })
          .eq('id', editingCourse.id);
        if (error) throw error;
        toast({ title: 'Course updated' });
      } else {
        const { error } = await supabase.from('courses').insert({
          title: formData.title,
          description: formData.description,
          cover_image_url: formData.cover_image_url || null,
          status: 'draft',
        });
        if (error) throw error;
        toast({ title: 'Course created' });
      }
      setCourseDialogOpen(false);
      fetchCourses();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save course', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const togglePublish = async (course: Course) => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('courses').update({ status: newStatus }).eq('id', course.id);
    if (!error) {
      toast({ title: newStatus === 'published' ? 'Course published' : 'Course unpublished' });
      fetchCourses();
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course and all its content?')) return;
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (!error) {
      toast({ title: 'Course deleted' });
      fetchCourses();
    }
  };

  const saveModule = async () => {
    if (!moduleFormData.title.trim()) return;
    try {
      if (editingModule.module) {
        await supabase.from('modules').update({ title: moduleFormData.title }).eq('id', editingModule.module.id);
      } else {
        const course = courses.find(c => c.id === editingModule.courseId);
        const orderIndex = course?.modules.length || 0;
        await supabase.from('modules').insert({
          course_id: editingModule.courseId,
          title: moduleFormData.title,
          order_index: orderIndex,
        });
      }
      setModuleDialogOpen(false);
      fetchCourses();
      toast({ title: 'Module saved' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save module', variant: 'destructive' });
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all lessons?')) return;
    await supabase.from('modules').delete().eq('id', moduleId);
    fetchCourses();
    toast({ title: 'Module deleted' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `lesson-files/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      setLessonFormData(prev => ({
        ...prev,
        resources: [...prev.resources, { title: file.name, url: publicUrl }]
      }));
      
      toast({ title: 'File uploaded' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const removeResource = (index: number) => {
    setLessonFormData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  const saveLesson = async () => {
    if (!lessonFormData.title.trim()) return;
    try {
      if (editingLesson.lesson) {
        await supabase.from('lessons').update({
          title: lessonFormData.title,
          description: lessonFormData.description || null,
          bunny_embed_url: lessonFormData.bunny_embed_url || null,
          is_preview: lessonFormData.is_preview,
          resources: lessonFormData.resources as unknown as Json,
        }).eq('id', editingLesson.lesson.id);
      } else {
        const module = courses.flatMap(c => c.modules).find(m => m.id === editingLesson.moduleId);
        const orderIndex = module?.lessons.length || 0;
        await supabase.from('lessons').insert({
          module_id: editingLesson.moduleId,
          title: lessonFormData.title,
          description: lessonFormData.description || null,
          bunny_embed_url: lessonFormData.bunny_embed_url || null,
          is_preview: lessonFormData.is_preview,
          resources: lessonFormData.resources as unknown as Json,
          order_index: orderIndex,
        });
      }
      setLessonDialogOpen(false);
      fetchCourses();
      toast({ title: 'Lesson saved' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save lesson', variant: 'destructive' });
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    await supabase.from('lessons').delete().eq('id', lessonId);
    fetchCourses();
    toast({ title: 'Lesson deleted' });
  };

  const handleModuleDragEnd = async (event: DragEndEvent, courseId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const oldIndex = course.modules.findIndex(m => m.id === active.id);
    const newIndex = course.modules.findIndex(m => m.id === over.id);
    const reorderedModules = arrayMove(course.modules, oldIndex, newIndex);

    // Optimistic update
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, modules: reorderedModules } : c));

    // Update database
    await Promise.all(reorderedModules.map((m, idx) =>
      supabase.from('modules').update({ order_index: idx }).eq('id', m.id)
    ));
  };

  const handleLessonDragEnd = async (event: DragEndEvent, moduleId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const course = courses.find(c => c.modules.some(m => m.id === moduleId));
    const module = course?.modules.find(m => m.id === moduleId);
    if (!module) return;

    const oldIndex = module.lessons.findIndex(l => l.id === active.id);
    const newIndex = module.lessons.findIndex(l => l.id === over.id);
    const reorderedLessons = arrayMove(module.lessons, oldIndex, newIndex);

    // Optimistic update
    setCourses(prev => prev.map(c => ({
      ...c,
      modules: c.modules.map(m => m.id === moduleId ? { ...m, lessons: reorderedLessons } : m)
    })));

    // Update database
    await Promise.all(reorderedLessons.map((l, idx) =>
      supabase.from('lessons').update({ order_index: idx }).eq('id', l.id)
    ));
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Course Management</h1>
            <p className="text-muted-foreground">Create and manage courses, modules, and lessons</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Manage Courses
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            <div className="flex justify-end mb-4">
              <Button className="bg-primary text-primary-foreground" onClick={() => openCourseDialog()}>
                <Plus className="w-4 h-4 mr-2" /> New Course
              </Button>
            </div>
            {loading ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
            ) : courses.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No courses yet</h3>
                  <p className="text-muted-foreground">Create your first course to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <Card key={course.id} className="glass-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{course.modules.length} modules • {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/hub/courses/${course.id}`, '_blank')}
                            title="Preview as user"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => togglePublish(course)}>
                            {course.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openCourseDialog(course)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteCourse(course.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleModuleDragEnd(e, course.id)}>
                        <SortableContext items={course.modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                          <Accordion type="multiple" className="space-y-2">
                            {course.modules.map((module) => (
                              <SortableModuleItem
                                key={module.id}
                                module={module}
                                onEdit={() => openModuleDialog(course.id, module)}
                                onDelete={() => deleteModule(module.id)}
                              >
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleLessonDragEnd(e, module.id)}>
                                  <SortableContext items={module.lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2 mb-4">
                                      {module.lessons.map((lesson) => (
                                        <SortableLessonItem
                                          key={lesson.id}
                                          lesson={lesson}
                                          onEdit={() => openLessonDialog(module.id, lesson)}
                                          onDelete={() => deleteLesson(lesson.id)}
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                                <Button variant="outline" size="sm" onClick={() => openLessonDialog(module.id)}>
                                  <Plus className="w-3 h-3 mr-1" /> Add Lesson
                                </Button>
                              </SortableModuleItem>
                            ))}
                          </Accordion>
                        </SortableContext>
                      </DndContext>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => openModuleDialog(course.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Module
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <CourseAnalytics />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit Course' : 'Create Course'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-secondary/50" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-secondary/50" rows={3} />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input value={formData.cover_image_url} onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })} className="bg-secondary/50" placeholder="https://..." />
            </div>
            <Button onClick={saveCourse} disabled={isCreating} className="w-full">
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCourse ? 'Update' : 'Create'} Course
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule.module ? 'Edit Module' : 'Add Module'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Module Title</Label>
              <Input value={moduleFormData.title} onChange={(e) => setModuleFormData({ title: e.target.value })} className="bg-secondary/50" />
            </div>
            <Button onClick={saveModule} className="w-full">Save Module</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson.lesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Title</Label>
              <Input value={lessonFormData.title} onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })} className="bg-secondary/50" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={lessonFormData.description} onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })} className="bg-secondary/50" rows={2} />
            </div>
            <div>
              <Label>Bunny Embed URL</Label>
              <Input value={lessonFormData.bunny_embed_url} onChange={(e) => setLessonFormData({ ...lessonFormData, bunny_embed_url: e.target.value })} className="bg-secondary/50" placeholder="https://iframe.mediadelivery.net/embed/..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={lessonFormData.is_preview} onCheckedChange={(c) => setLessonFormData({ ...lessonFormData, is_preview: c })} />
              <Label>Free Preview</Label>
            </div>
            
            {/* File Upload Section */}
            <div className="space-y-3">
              <Label>Lesson Files</Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span className="text-sm">{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                </label>
              </div>
              {lessonFormData.resources.length > 0 && (
                <div className="space-y-2">
                  {lessonFormData.resources.map((resource, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate">{resource.title}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeResource(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button onClick={saveLesson} className="w-full">Save Lesson</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
