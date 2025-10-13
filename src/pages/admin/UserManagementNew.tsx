import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Shield,
  UserPlus,
  Building2,
  PencilLine,
  RefreshCw,
  Mail,
  Coins,
  Trash2,
  Ban,
  Users
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Modal,
  Input,
  Label,
  Select
} from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { adminService } from '../../services/adminService';
import { organizationService, type Organization } from '../../services/organizationService';
import { cn } from '../../utils/cn';

type ModalType = 'createOrg' | 'editOrg' | 'deleteOrg' | 'createUser' | 'editUser' | 'emailUser' | 'creditsUser' | 'resetUser' | 'deleteUser' | null;

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  plan_type: string;
  total_credits: number;
  used_credits: number;
  available_credits: number;
  organization_id: string | null;
  created_at: string;
  last_login?: string;
}

const roleOptions = [
  { value: 'agent', label: 'Agent' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' }
];

const typeOptions = [
  { value: 'parent', label: 'Parent Organization' },
  { value: 'agency', label: 'Agency' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'partner', label: 'Partner' }
];

const formatDate = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const initialsFor = (name: string) => {
  const segments = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return '??';
  }

  if (segments.length === 1) {
    return segments[0]!.slice(0, 2).toUpperCase();
  }

  return `${segments[0]![0]}${segments[segments.length - 1]![0]}`.toUpperCase();
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function UserManagementNew() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';

  // Organizations state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [orgForm, setOrgForm] = useState({
    id: '',
    name: '',
    slug: '',
    type: 'agency',
    isActive: true
  });

  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'agent',
    credits: '0',
    organizationId: ''
  });

  const [emailForm, setEmailForm] = useState({ email: '' });
  const [creditsForm, setCreditsForm] = useState({ amount: '' });

  const [orgError, setOrgError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Access control check
  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <Shield className="h-16 w-16 text-gray-400 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-[var(--muted)]">
              You don't have permission to access User Management. This feature is only available to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Load organizations
  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const response = await organizationService.listOrganizations({
        page: 1,
        limit: 100,
        isActive: true
      });

      if (response.success && response.data) {
        const orgs = response.data;
        setOrganizations(orgs);

        // Auto-select organization
        if (orgs.length > 0) {
          if (isAdmin && user?.organizationId) {
            // Admin: select their organization
            setSelectedOrgId(user.organizationId);
          } else if (!selectedOrgId) {
            // Super-admin: select first org
            setSelectedOrgId(orgs[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      setFeedback({ type: 'error', message: 'Failed to load organizations' });
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // Load users for selected organization
  const loadUsers = async (organizationId: string) => {
    setIsLoadingUsers(true);
    try {
      const response = await adminService.listUsers({
        organizationId,
        page: 1,
        limit: 100
      });

      if (response.success && response.data) {
        const userData = Array.isArray(response.data) ? response.data : [];
        
        // Map to User interface
        const mappedUsers: User[] = userData.map((u: any) => ({
          id: u.id || u.user_id,
          user_id: u.user_id,
          email: u.user?.email || u.email || '',
          full_name: u.full_name || u.user?.full_name || '',
          role: u.role,
          plan_type: u.plan_type,
          total_credits: u.total_credits || 0,
          used_credits: u.used_credits || 0,
          available_credits: (u.total_credits || 0) - (u.used_credits || 0),
          organization_id: u.organization_id,
          created_at: u.created_at,
          last_login: u.last_login
        }));

        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setFeedback({ type: 'error', message: 'Failed to load users' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  // Load users when organization is selected
  useEffect(() => {
    if (selectedOrgId) {
      loadUsers(selectedOrgId);
    }
  }, [selectedOrgId]);

  // Clear feedback after delay
  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timeout);
  }, [feedback]);

  // Filtered organizations
  const filteredOrgs = useMemo(() => {
    const query = orgSearchTerm.trim().toLowerCase();
    let orgs = organizations;

    // For admins, only show their organization
    if (isAdmin && user?.organizationId) {
      orgs = orgs.filter(org => org.id === user.organizationId);
    }

    if (query) {
      orgs = orgs.filter(org =>
        org.name.toLowerCase().includes(query) ||
        org.slug.toLowerCase().includes(query)
      );
    }

    return orgs;
  }, [organizations, orgSearchTerm, isAdmin, user?.organizationId]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const query = userSearchTerm.trim().toLowerCase();
    let filtered = users;

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (query) {
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, userSearchTerm, roleFilter]);

  // Selected organization
  const selectedOrg = useMemo(() => {
    return organizations.find(org => org.id === selectedOrgId) || null;
  }, [organizations, selectedOrgId]);

  // Selected user
  const selectedUser = useMemo(() => {
    return users.find(u => u.user_id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Get user count for each organization
  const orgUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // This would ideally come from the API, but for now we calculate based on loaded users
    organizations.forEach(org => {
      counts[org.id] = 0; // Would need to fetch this from backend
    });
    return counts;
  }, [organizations]);

  // Modal handlers
  const closeModal = () => {
    setActiveModal(null);
    setOrgError(null);
    setUserError(null);
  };

  const handleOpenCreateOrg = () => {
    setOrgForm({
      id: '',
      name: '',
      slug: '',
      type: 'agency',
      isActive: true
    });
    setOrgError(null);
    setActiveModal('createOrg');
  };

  const handleOpenEditOrg = (org: Organization) => {
    setOrgForm({
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      isActive: org.is_active
    });
    setOrgError(null);
    setActiveModal('editOrg');
  };

  const handleOpenDeleteOrg = (org: Organization) => {
    setSelectedOrgId(org.id);
    setActiveModal('deleteOrg');
  };

  const handleOpenCreateUser = () => {
    setUserForm({
      id: '',
      name: '',
      email: '',
      role: 'agent',
      credits: '0',
      organizationId: selectedOrgId || ''
    });
    setUserError(null);
    setActiveModal('createUser');
  };

  const handleOpenEditUser = (user: User) => {
    setUserForm({
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      credits: user.total_credits.toString(),
      organizationId: user.organization_id || ''
    });
    setUserError(null);
    setActiveModal('editUser');
  };

  const handleOpenEmailUser = (user: User) => {
    setSelectedUserId(user.user_id);
    setEmailForm({ email: user.email });
    setActiveModal('emailUser');
  };

  const handleOpenCreditsUser = (user: User) => {
    setSelectedUserId(user.user_id);
    setCreditsForm({ amount: '' });
    setActiveModal('creditsUser');
  };

  const handleOpenResetUser = (user: User) => {
    setSelectedUserId(user.user_id);
    setActiveModal('resetUser');
  };

  const handleOpenDeleteUser = (user: User) => {
    setSelectedUserId(user.user_id);
    setActiveModal('deleteUser');
  };

  // Organization CRUD operations
  const handleCreateOrgSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrgError(null);

    const trimmedName = orgForm.name.trim();
    const trimmedSlug = orgForm.slug.trim() || slugify(trimmedName);

    if (!trimmedName) {
      setOrgError('Organization name is required.');
      return;
    }

    if (organizations.some(org => org.slug === trimmedSlug)) {
      setOrgError('An organization with this slug already exists.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await organizationService.createOrganization({
        name: trimmedName,
        slug: trimmedSlug,
        type: orgForm.type
      });

      if (!response.success || !response.data) {
        setOrgError(response.error || 'Failed to create organization.');
        return;
      }

      setFeedback({
        type: 'success',
        message: `${response.data.name} was created successfully.`
      });
      closeModal();
      loadOrganizations();
    } catch (error) {
      setOrgError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrgSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrgError(null);

    if (!orgForm.id) {
      setOrgError('No organization selected.');
      return;
    }

    const trimmedName = orgForm.name.trim();
    const trimmedSlug = orgForm.slug.trim();

    if (!trimmedName) {
      setOrgError('Organization name is required.');
      return;
    }

    const existingOrg = organizations.find(org => org.slug === trimmedSlug && org.id !== orgForm.id);
    if (existingOrg) {
      setOrgError('An organization with this slug already exists.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await organizationService.updateOrganization(orgForm.id, {
        name: trimmedName,
        slug: trimmedSlug,
        type: orgForm.type,
        isActive: orgForm.isActive
      });

      if (!response.success || !response.data) {
        setOrgError(response.error || 'Failed to update organization.');
        return;
      }

      setFeedback({
        type: 'success',
        message: `${response.data.name} was updated successfully.`
      });
      closeModal();
      loadOrganizations();
    } catch (error) {
      setOrgError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrgConfirm = async () => {
    if (!selectedOrgId) {
      setFeedback({ type: 'error', message: 'No organization selected.' });
      closeModal();
      return;
    }

    const org = organizations.find(o => o.id === selectedOrgId);
    if (!org) {
      setFeedback({ type: 'error', message: 'Organization not found.' });
      closeModal();
      return;
    }

    if (org.slug === 'tala-ai' || org.type === 'parent') {
      setFeedback({
        type: 'error',
        message: 'Cannot delete the parent Tala AI organization.'
      });
      closeModal();
      return;
    }

    try {
      const response = await organizationService.deleteOrganization(selectedOrgId);

      if (!response.success) {
        setFeedback({ type: 'error', message: response.error || 'Failed to deactivate organization.' });
        closeModal();
        return;
      }

      setFeedback({ type: 'success', message: `${org.name} was deactivated successfully.` });
      closeModal();
      loadOrganizations();
    } catch (error) {
      setFeedback({ type: 'error', message: 'An unexpected error occurred.' });
      closeModal();
    }
  };

  // User CRUD operations
  const handleCreateUserSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserError(null);

    const trimmedName = userForm.name.trim();
    const trimmedEmail = userForm.email.trim();
    const creditsValue = Number(userForm.credits);

    if (!trimmedName) {
      setUserError('Name is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setUserError('Enter a valid email address.');
      return;
    }

    if (Number.isNaN(creditsValue) || creditsValue < 0) {
      setUserError('Credits must be zero or greater.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await adminService.createUser({
        email: trimmedEmail,
        fullName: trimmedName,
        role: userForm.role as any,
        organizationId: userForm.organizationId || undefined,
        credits: creditsValue,
        sendInvite: true
      });

      if (!response.success || !response.data) {
        setUserError(response.error || 'Failed to create user.');
        return;
      }

      const inviteMessage = response.data.invitationSent
        ? ` An invitation email has been sent to ${trimmedEmail}.`
        : '';

      setFeedback({
        type: 'success',
        message: `${response.data.fullName} was created successfully.${inviteMessage}`
      });
      closeModal();
      if (selectedOrgId) {
        loadUsers(selectedOrgId);
      }
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!selectedUserId) {
      setFeedback({ type: 'error', message: 'No user selected.' });
      closeModal();
      return;
    }

    const user = users.find(u => u.user_id === selectedUserId);
    if (!user) {
      setFeedback({ type: 'error', message: 'User not found.' });
      closeModal();
      return;
    }

    try {
      const response = await adminService.deleteUser(selectedUserId);

      if (!response.success) {
        setFeedback({ type: 'error', message: response.error || 'Failed to delete user.' });
        closeModal();
        return;
      }

      setFeedback({ type: 'success', message: `${user.full_name} was deleted successfully.` });
      closeModal();
      if (selectedOrgId) {
        loadUsers(selectedOrgId);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An unexpected error occurred.' });
      closeModal();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--fg)]">User Management</h1>
          <p className="text-sm text-[var(--muted)]">
            Manage organizations and their users in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isSuperAdmin && (
            <Button onClick={handleOpenCreateOrg} variant="secondary" className="whitespace-nowrap">
              <Building2 className="h-4 w-4" /> Create Organization
            </Button>
          )}
          <Button onClick={handleOpenCreateUser} className="whitespace-nowrap">
            <UserPlus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
          )}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_3fr)]">
        {/* Organizations Panel */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle as="h2" className="text-xl">
                  Organizations
                </CardTitle>
                <CardDescription>
                  {filteredOrgs.length} {filteredOrgs.length === 1 ? 'organization' : 'organizations'}
                </CardDescription>
              </div>
            </div>
            <div className="mt-3">
              <Input
                placeholder="Search organizations..."
                value={orgSearchTerm}
                onChange={(event) => setOrgSearchTerm(event.target.value)}
                startIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingOrgs && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-sm text-[var(--muted)]">
                Loading organizations...
              </div>
            )}

            {!isLoadingOrgs && filteredOrgs.length === 0 && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-sm text-[var(--muted)]">
                No organizations found.
              </div>
            )}

            {!isLoadingOrgs && filteredOrgs.map((org) => {
              const isActive = selectedOrgId === org.id;
              const isParent = org.type === 'parent' || org.slug === 'tala-ai';
              const userCount = users.filter(u => u.organization_id === org.id).length;

              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgId(org.id)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                    'hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5',
                    isActive
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-[var(--border)] bg-[var(--panel)]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)]/30 text-sm font-semibold text-[var(--fg)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-[var(--fg)] truncate">
                          {org.name}
                        </p>
                        {isParent && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                            (Parent)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <Users className="h-3 w-3" />
                        <span>{selectedOrgId === org.id ? filteredUsers.length : '...'} users</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Users Panel */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle as="h2" className="text-xl">
                  {selectedOrg ? selectedOrg.name : 'Select Organization'}
                </CardTitle>
                <CardDescription>
                  {selectedOrg
                    ? `${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'} found`
                    : 'Select an organization to view users'}
                </CardDescription>
              </div>
            </div>
            {selectedOrg && (
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
                <Input
                  placeholder="Search by name or email"
                  value={userSearchTerm}
                  onChange={(event) => setUserSearchTerm(event.target.value)}
                  startIcon={<Search className="h-4 w-4" />}
                />
                <Select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  options={[{ value: 'all', label: 'All roles' }, ...roleOptions]}
                  className="w-full lg:w-[180px]"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedOrg && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-[var(--muted)]">
                  Select an organization from the list to view its users
                </p>
              </div>
            )}

            {selectedOrg && isLoadingUsers && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-sm text-[var(--muted)]">
                Loading users...
              </div>
            )}

            {selectedOrg && !isLoadingUsers && filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
                <Users className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-[var(--muted)] mb-3">
                  No users found in this organization
                </p>
                <Button onClick={handleOpenCreateUser} size="sm">
                  <UserPlus className="h-4 w-4" /> Add First User
                </Button>
              </div>
            )}

            {selectedOrg && !isLoadingUsers && filteredUsers.map((user) => {
              const isActive = selectedUserId === user.user_id;

              return (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => setSelectedUserId(user.user_id)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                    'hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5',
                    isActive
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-[var(--border)] bg-[var(--panel)]'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)]/30 text-sm font-semibold text-[var(--fg)]">
                      {initialsFor(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--fg)] truncate">{user.full_name}</p>
                          <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 font-medium',
                              user.role === 'super_admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-200'
                                : user.role === 'admin'
                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                            )}
                          >
                            {roleOptions.find((r) => r.value === user.role)?.label || user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* User Details Card - Shows when user is selected */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-xl">
              User Details
            </CardTitle>
            <CardDescription>Manage {selectedUser.full_name}'s account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--fg)]">{selectedUser.full_name}</h3>
                <p className="text-sm text-[var(--muted)]">{selectedUser.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 font-medium',
                    selectedUser.role === 'super_admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-200'
                      : selectedUser.role === 'admin'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  )}
                >
                  {roleOptions.find((r) => r.value === selectedUser.role)?.label || selectedUser.role}
                </span>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                <p className="text-[var(--muted)]">Credits</p>
                <p className="text-lg font-semibold text-[var(--fg)]">{formatNumber(selectedUser.available_credits)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                <p className="text-[var(--muted)]">Total Credits</p>
                <p className="text-lg font-semibold text-[var(--fg)]">{formatNumber(selectedUser.total_credits)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                <p className="text-[var(--muted)]">Joined</p>
                <p className="text-base text-[var(--fg)]">{formatDate(selectedUser.created_at)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                <p className="text-[var(--muted)]">Last Login</p>
                <p className="text-base text-[var(--fg)]">{formatDate(selectedUser.last_login || '')}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => handleOpenCreditsUser(selectedUser)}
              >
                <Coins className="h-4 w-4" /> Add Credits
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleOpenResetUser(selectedUser)}
              >
                <RefreshCw className="h-4 w-4" /> Reset Password
              </Button>
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 md:col-span-2"
                onClick={() => handleOpenDeleteUser(selectedUser)}
              >
                <Trash2 className="h-4 w-4" /> Delete User
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Organization Modal */}
      <Modal isOpen={activeModal === 'createOrg'} onClose={closeModal} title="Create Organization" size="lg">
        <form className="space-y-4" onSubmit={handleCreateOrgSubmit}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setOrgForm((prev) => ({
                    ...prev,
                    name,
                    slug: prev.slug || slugify(name)
                  }));
                }}
                placeholder="Acme Travel Agency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={orgForm.slug}
                onChange={(event) =>
                  setOrgForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))
                }
                placeholder="acme-travel-agency"
              />
              <p className="text-xs text-[var(--muted)]">
                URL-friendly identifier (auto-generated from name if left empty)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-type">Type</Label>
              <Select
                id="org-type"
                value={orgForm.type}
                onChange={(event) => setOrgForm((prev) => ({ ...prev, type: event.target.value }))}
                options={typeOptions.filter((opt) => opt.value !== 'parent')}
              />
            </div>
          </div>

          {orgError && <p className="text-sm text-rose-500">{orgError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={activeModal === 'createUser'} onClose={closeModal} title="Add User" size="lg">
        <form className="space-y-4" onSubmit={handleCreateUserSubmit}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                value={userForm.name}
                onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Jordan Evans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={userForm.email}
                onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-org">Organization</Label>
              {isSuperAdmin ? (
                <Select
                  id="user-org"
                  value={userForm.organizationId}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, organizationId: event.target.value }))}
                  options={[
                    { value: '', label: 'No Organization' },
                    ...organizations.map((org) => ({ value: org.id, label: org.name }))
                  ]}
                />
              ) : (
                <Input
                  id="user-org"
                  value={selectedOrg?.name || 'Your Organization'}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <Select
                  id="user-role"
                  value={userForm.role}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
                  options={roleOptions}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-credits">Starting Credits</Label>
                <Input
                  id="user-credits"
                  inputMode="numeric"
                  value={userForm.credits}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, credits: event.target.value }))}
                />
              </div>
            </div>
          </div>

          {userError && <p className="text-sm text-rose-500">{userError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal isOpen={activeModal === 'deleteUser'} onClose={closeModal} title="Delete User" size="md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>? This action cannot be undone.
            All user data, credits, and access will be permanently removed.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={handleDeleteUserConfirm}
            >
              <Trash2 className="h-4 w-4" /> Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Organization Confirmation Modal */}
      <Modal isOpen={activeModal === 'deleteOrg'} onClose={closeModal} title="Deactivate Organization" size="md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Are you sure you want to deactivate <strong>{selectedOrg?.name}</strong>? This will prevent users from
            accessing this organization's resources. You can reactivate it later.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={handleDeleteOrgConfirm}
            >
              <Ban className="h-4 w-4" /> Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
