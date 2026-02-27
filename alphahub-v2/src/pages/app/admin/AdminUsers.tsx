import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Shield, BookOpen, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AddTeamMemberDialog from '@/components/admin/AddTeamMemberDialog';
import AddClientUserDialog from '@/components/admin/AddClientUserDialog';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  role: 'admin' | 'member' | 'client' | 'guest';
}

interface ClientRecord {
  id: string;
  name: string | null;
  email: string | null;
  agent_id: string | null;
  status: string | null;
  user_id: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface Enrollment {
  course_id: string;
  granted_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [teamSearch, setTeamSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<Enrollment[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchClients();
    fetchCourses();
  }, []);

  const fetchUsers = async () => {
    setLoadingTeam(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profiles) {
        const usersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id)
              .maybeSingle();

            return {
              ...profile,
              role: (roleData?.role as 'admin' | 'member' | 'client' | 'guest') || 'guest',
            };
          })
        );
        // Filter to only show true team members (admin, member - NOT guest or client)
        const teamMembers = usersWithRoles.filter(u => u.role === 'admin' || u.role === 'member');
        setUsers(teamMembers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, agent_id, status, user_id')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title');
    if (data) setCourses(data);
  };

  const fetchUserEnrollments = async (userId: string) => {
    const { data } = await supabase
      .from('enrollments')
      .select('course_id, granted_at')
      .eq('user_id', userId)
      .is('revoked_at', null);
    setUserEnrollments(data || []);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'member' | 'guest') => {
    setIsUpdating(true);
    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, role: newRole });
      toast({ title: 'Role updated', description: `User role changed to ${newRole}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const grantAccess = async (userId: string, courseId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('enrollments').insert({
        user_id: userId,
        course_id: courseId,
      });

      if (error) throw error;
      await fetchUserEnrollments(userId);
      toast({ title: 'Access granted', description: 'User enrolled in course' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to grant access', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const revokeAccess = async (userId: string, courseId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) throw error;
      await fetchUserEnrollments(userId);
      toast({ title: 'Access revoked', description: 'User removed from course' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to revoke access', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.agent_id?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'active': return 'default';
      case 'onboarding': return 'secondary';
      case 'paused': return 'outline';
      default: return 'outline';
    }
  };

  const handleRefresh = () => {
    fetchUsers();
    fetchClients();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage team members and client accounts</p>
          </div>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="team" className="gap-2">
              <Shield className="w-4 h-4" />
              Team ({users.length})
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Clients ({clients.length})
            </TabsTrigger>
          </TabsList>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members by name or email..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="pl-10 bg-secondary/50"
                />
              </div>
              <AddTeamMemberDialog onSuccess={handleRefresh} />
            </div>

            <Card className="glass-card">
              <CardContent className="p-0">
                {loadingTeam ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    No team members found
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{user.name || 'Unnamed'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                            {user.role}
                          </Badge>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  fetchUserEnrollments(user.id);
                                }}
                              >
                                Manage
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary/20 text-primary">
                                      {getInitials(selectedUser?.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p>{selectedUser?.name}</p>
                                    <p className="text-sm font-normal text-muted-foreground">
                                      {selectedUser?.email}
                                    </p>
                                  </div>
                                </DialogTitle>
                              </DialogHeader>

                              <div className="space-y-6 pt-4">
                                {/* Role */}
                                <div>
                                  <label className="text-sm font-medium text-foreground mb-2 block">
                                    User Role
                                  </label>
                                  <Select
                                    value={selectedUser?.role}
                                    onValueChange={(value) => selectedUser && updateUserRole(selectedUser.id, value as 'admin' | 'member' | 'guest')}
                                    disabled={isUpdating}
                                  >
                                    <SelectTrigger className="bg-secondary/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="guest">Guest</SelectItem>
                                      <SelectItem value="member">Member</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Course Access */}
                                <div>
                                  <label className="text-sm font-medium text-foreground mb-2 block">
                                    Course Access
                                  </label>
                                  <div className="space-y-2">
                                    {courses.map((course) => {
                                      const isEnrolled = userEnrollments.some(e => e.course_id === course.id);
                                      return (
                                        <div key={course.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                          <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                            <span className="text-sm">{course.title}</span>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant={isEnrolled ? "destructive" : "default"}
                                            onClick={() => selectedUser && (isEnrolled
                                              ? revokeAccess(selectedUser.id, course.id)
                                              : grantAccess(selectedUser.id, course.id)
                                            )}
                                            disabled={isUpdating}
                                          >
                                            {isEnrolled ? 'Revoke' : 'Grant'}
                                          </Button>
                                        </div>
                                      );
                                    })}
                                    {courses.length === 0 && (
                                      <p className="text-sm text-muted-foreground text-center py-4">
                                        No courses created yet
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name, email, or agent ID..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10 bg-secondary/50"
                />
              </div>
              <AddClientUserDialog onSuccess={handleRefresh} />
            </div>

            <Card className="glass-card">
              <CardContent className="p-0">
                {loadingClients ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    No clients found
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredClients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{client.name || 'Unnamed'}</p>
                              {client.user_id ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm hidden md:block">
                            <p className="text-muted-foreground">{client.agent_id}</p>
                          </div>
                          
                          <Badge variant={getStatusBadgeVariant(client.status)} className="capitalize">
                            {client.status || 'unknown'}
                          </Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/hub/admin/clients/${client.id}`)}
                            className="gap-1"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
