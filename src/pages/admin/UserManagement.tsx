import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Shield,
  UserPlus,
  PencilLine,
  RefreshCw,
  Mail,
  Coins,
  Trash2
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
import { useUserManagementStore } from '../../store/userManagementStore';
import { adminService } from '../../services/adminService';
import type {
  AdminTeam,
  ManagedUser,
  ManagedUserRole,
  ManagedUserStatus
} from '../../types/userManagement';
import { cn } from '../../utils/cn';

type ModalType = 'create' | 'edit' | 'email' | 'credits' | 'reset' | 'delete' | null;

type ModalContext = {
  adminId: string | null;
  user: ManagedUser | null;
};

type RoleFilter = 'all' | ManagedUserRole;

const roleLabels: Record<ManagedUserRole, string> = {
  agent: 'Agent',
  admin: 'Admin',
  analyst: 'Analyst'
};

const statusLabels: Record<ManagedUserStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  suspended: 'Suspended'
};

const roleOptions: Array<{ value: ManagedUserRole; label: string }> = [
  { value: 'agent', label: 'Agent' },
  { value: 'admin', label: 'Admin' },
  { value: 'analyst', label: 'Analyst' }
];

const statusOptions: Array<{ value: ManagedUserStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' }
];

const statusTone: Record<ManagedUserStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  invited: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
  suspended: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
};

const roleTone: Record<ManagedUserRole, string> = {
  agent: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-200',
  analyst: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
};

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

export function UserManagement() {
  const { user } = useAuthStore();
  const {
    admins,
    setUsers,
    createUser,
    updateUser,
    changeUserEmail,
    resetUserPassword,
    addUserCredits
  } = useUserManagementStore();

  const isSuperAdmin = user?.role === 'super_admin';

  const accessibleAdmins = useMemo(() => {
    if (!user) return [];
    if (isSuperAdmin) return admins;

    return admins.filter((admin) => admin.email === user.email || admin.id === user.id);
  }, [admins, isSuperAdmin, user]);

  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [context, setContext] = useState<ModalContext>({ adminId: null, user: null });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [createForm, setCreateForm] = useState({
    adminId: '',
    name: '',
    email: '',
    role: roleOptions[0]?.value ?? 'agent',
    status: statusOptions[1]?.value ?? 'invited',
    credits: '0'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    role: roleOptions[0]?.value ?? 'agent',
    status: statusOptions[0]?.value ?? 'active'
  });

  const [emailForm, setEmailForm] = useState({ email: '' });
  const [creditsForm, setCreditsForm] = useState({ amount: '' });

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await adminService.listUsers();
      if (response.success && response.data) {
        console.log('Loaded users from API:', response.data);
        const users = Array.isArray(response.data) ? response.data : response.data.users || [];
        setUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (accessibleAdmins.length === 0) {
      setSelectedAdminId('');
      setSelectedUserId(null);
      return;
    }

    if (!selectedAdminId || !accessibleAdmins.some((admin) => admin.id === selectedAdminId)) {
      setSelectedAdminId(accessibleAdmins[0]!.id);
    }
  }, [accessibleAdmins, selectedAdminId]);

  const selectedAdmin = useMemo<AdminTeam | null>(() => {
    if (!selectedAdminId) return accessibleAdmins[0] ?? null;
    return accessibleAdmins.find((admin) => admin.id === selectedAdminId) ?? accessibleAdmins[0] ?? null;
  }, [accessibleAdmins, selectedAdminId]);

  const teamUsers = selectedAdmin?.users ?? [];

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return teamUsers.filter((teamUser) => {
      const matchesRole = roleFilter === 'all' || teamUser.role === roleFilter;
      const matchesQuery =
        query.length === 0 ||
        teamUser.name.toLowerCase().includes(query) ||
        teamUser.email.toLowerCase().includes(query);

      return matchesRole && matchesQuery;
    });
  }, [roleFilter, searchTerm, teamUsers]);

  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedUserId(null);
      return;
    }

    if (!selectedUserId || !filteredUsers.some((userItem) => userItem.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0]!.id);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = useMemo(() => {
    if (!selectedAdmin) return null;
    if (!selectedUserId) return null;

    return selectedAdmin.users.find((teamUser) => teamUser.id === selectedUserId) ?? null;
  }, [selectedAdmin, selectedUserId]);

  const closeModal = () => {
    setActiveModal(null);
    setContext({ adminId: null, user: null });
    setCreateError(null);
    setEditError(null);
    setEmailError(null);
    setCreditsError(null);
  };

  const handleOpenCreate = () => {
    const defaultAdminId = selectedAdmin?.id ?? accessibleAdmins[0]?.id ?? '';

    setCreateForm({
      adminId: defaultAdminId,
      name: '',
      email: '',
      role: roleOptions[0]?.value ?? 'agent',
      status: statusOptions[1]?.value ?? 'invited',
      credits: '0'
    });
    setCreateError(null);
    setActiveModal('create');
  };

  const handleOpenEdit = (admin: AdminTeam, userToEdit: ManagedUser) => {
    setContext({ adminId: admin.id, user: userToEdit });
    setEditForm({ name: userToEdit.name, role: userToEdit.role, status: userToEdit.status });
    setEditError(null);
    setActiveModal('edit');
  };

  const handleOpenEmail = (admin: AdminTeam, userToEdit: ManagedUser) => {
    setContext({ adminId: admin.id, user: userToEdit });
    setEmailForm({ email: userToEdit.email });
    setEmailError(null);
    setActiveModal('email');
  };

  const handleOpenCredits = (admin: AdminTeam, userToEdit: ManagedUser) => {
    setContext({ adminId: admin.id, user: userToEdit });
    setCreditsForm({ amount: '' });
    setCreditsError(null);
    setActiveModal('credits');
  };

  const handleOpenDelete = (admin: AdminTeam, userToDelete: ManagedUser) => {
    setContext({ adminId: admin.id, user: userToDelete });
    setActiveModal('delete');
  };

  const handleOpenReset = (admin: AdminTeam, userToReset: ManagedUser) => {
    setContext({ adminId: admin.id, user: userToReset });
    setActiveModal('reset');
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const trimmedName = createForm.name.trim();
    const trimmedEmail = createForm.email.trim();
    const creditsValue = Number(createForm.credits);

    if (!trimmedName) {
      setCreateError('Name is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setCreateError('Enter a valid email address.');
      return;
    }

    if (Number.isNaN(creditsValue) || creditsValue < 0) {
      setCreateError('Credits must be zero or greater.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await adminService.createUser({
        email: trimmedEmail,
        fullName: trimmedName,
        role: createForm.role,
        credits: creditsValue,
        sendInvite: true
      });

      if (!response.success || !response.data) {
        setCreateError(response.error || 'Failed to create user. Please try again.');
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
      loadUsers();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditError(null);

    if (!context.adminId || !context.user) {
      setEditError('No user selected.');
      return;
    }

    const trimmedName = editForm.name.trim();

    if (!trimmedName) {
      setEditError('Name is required.');
      return;
    }

    updateUser(context.adminId, context.user.id, {
      name: trimmedName,
      role: editForm.role,
      status: editForm.status
    });

    setFeedback({ type: 'success', message: 'User details were updated.' });
    closeModal();
  };

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError(null);

    if (!context.adminId || !context.user) {
      setEmailError('No user selected.');
      return;
    }

    const trimmedEmail = emailForm.email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    changeUserEmail(context.adminId, context.user.id, trimmedEmail);
    setFeedback({ type: 'success', message: 'Email address updated.' });
    closeModal();
  };

  const handleCreditsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreditsError(null);

    if (!context.adminId || !context.user) {
      setCreditsError('No user selected.');
      return;
    }

    const amount = Number(creditsForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setCreditsError('Enter a credit amount greater than zero.');
      return;
    }

    addUserCredits(context.adminId, context.user.id, amount);
    setFeedback({ type: 'success', message: `${amount} credits added.` });
    closeModal();
  };

  const handleResetConfirm = () => {
    if (!context.adminId || !context.user) {
      setFeedback({ type: 'error', message: 'No user selected.' });
      closeModal();
      return;
    }

    resetUserPassword(context.adminId, context.user.id);
    setFeedback({ type: 'success', message: 'Password reset email sent.' });
    closeModal();
  };

  const handleDeleteConfirm = async () => {
    if (!context.user) {
      setFeedback({ type: 'error', message: 'No user selected.' });
      closeModal();
      return;
    }

    try {
      const response = await adminService.deleteUser(context.user.id);
      
      if (!response.success) {
        setFeedback({ type: 'error', message: response.error || 'Failed to delete user.' });
        closeModal();
        return;
      }

      setFeedback({ type: 'success', message: `${context.user.name} was deleted successfully.` });
      closeModal();
      loadUsers();
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
            Keep your teams organised. Choose a user to see their contact card and actions.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isSuperAdmin && (
            <Select
              value={selectedAdminId}
              onChange={(event) => setSelectedAdminId(event.target.value)}
              options={accessibleAdmins.map((admin) => ({ value: admin.id, label: admin.teamName }))}
              className="min-w-[220px]"
            />
          )}
          {!isSuperAdmin && selectedAdmin && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)]">
              <Shield className="h-4 w-4 text-amber-500" />
              {selectedAdmin.teamName}
            </div>
          )}
          <Button onClick={handleOpenCreate} className="whitespace-nowrap">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
        <Card className="h-full">
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle as="h2" className="text-xl">
                  {selectedAdmin ? selectedAdmin.teamName : 'No team available'}
                </CardTitle>
                <CardDescription>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'} found
                </CardDescription>
              </div>
              {selectedAdmin && (
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
                  {formatNumber(selectedAdmin.users.length)} total users
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                startIcon={<Search className="h-4 w-4" />}
              />
              <Select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                options={[{ value: 'all', label: 'All roles' }, ...roleOptions]}
                className="w-full lg:w-[180px]"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredUsers.length === 0 && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-10 text-sm text-[var(--muted)]">
                No users match your filters.
              </div>
            )}

            {filteredUsers.map((teamUser) => {
              const isActive = selectedUserId === teamUser.id;

              return (
                <button
                  key={teamUser.id}
                  type="button"
                  onClick={() => setSelectedUserId(teamUser.id)}
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
                      {initialsFor(teamUser.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-[var(--fg)]">{teamUser.name}</p>
                          <p className="text-xs text-[var(--muted)]">{teamUser.email}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn('rounded-full px-2.5 py-1 font-medium', roleTone[teamUser.role])}>
                            {roleLabels[teamUser.role]}
                          </span>
                          <span className={cn('rounded-full px-2.5 py-1 font-medium', statusTone[teamUser.status])}>
                            {statusLabels[teamUser.status]}
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

        <Card className="h-full">
          <CardHeader>
            <CardTitle as="h2" className="text-xl">
              Contact Card
            </CardTitle>
            <CardDescription>Select a teammate to view quick actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedUser && (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--muted)]">
                Choose a user from the list to manage their details.
              </div>
            )}

            {selectedUser && selectedAdmin && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">{selectedUser.name}</h3>
                    <p className="text-sm text-[var(--muted)]">{selectedUser.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={cn('rounded-full px-2.5 py-1 font-medium', roleTone[selectedUser.role])}>
                      {roleLabels[selectedUser.role]}
                    </span>
                    <span className={cn('rounded-full px-2.5 py-1 font-medium', statusTone[selectedUser.status])}>
                      {statusLabels[selectedUser.status]}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Credits</p>
                    <p className="text-lg font-semibold text-[var(--fg)]">{formatNumber(selectedUser.credits)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Last login</p>
                    <p className="text-base text-[var(--fg)]">{formatDate(selectedUser.lastLogin)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Joined</p>
                    <p className="text-base text-[var(--fg)]">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Password reset</p>
                    <p className="text-base text-[var(--fg)]">{formatDate(selectedUser.lastPasswordReset)}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEdit(selectedAdmin, selectedUser)}
                  >
                    <PencilLine className="h-4 w-4" /> Edit details
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEmail(selectedAdmin, selectedUser)}
                  >
                    <Mail className="h-4 w-4" /> Change email
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenCredits(selectedAdmin, selectedUser)}
                  >
                    <Coins className="h-4 w-4" /> Add credits
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenReset(selectedAdmin, selectedUser)}
                  >
                    <RefreshCw className="h-4 w-4" /> Reset password
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 md:col-span-2"
                    onClick={() => handleOpenDelete(selectedAdmin, selectedUser)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete user
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={activeModal === 'create'} onClose={closeModal} title="Add user" size="lg">
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          <div className="grid gap-4">
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="create-admin">Assign to admin</Label>
                <Select
                  id="create-admin"
                  value={createForm.adminId}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, adminId: event.target.value }))}
                  options={accessibleAdmins.map((admin) => ({ value: admin.id, label: admin.teamName }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name">Full name</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Jordan Evans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="name@company.com"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  id="create-role"
                  value={createForm.role}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value as ManagedUserRole }))}
                  options={roleOptions}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-status">Status</Label>
                <Select
                  id="create-status"
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, status: event.target.value as ManagedUserStatus }))
                  }
                  options={statusOptions}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-credits">Starting credits</Label>
                <Input
                  id="create-credits"
                  inputMode="numeric"
                  value={createForm.credits}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, credits: event.target.value }))}
                />
              </div>
            </div>
          </div>

          {createError && <p className="text-sm text-rose-500">{createError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create user'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'edit'} onClose={closeModal} title="Edit details" size="lg">
        <form className="space-y-4" onSubmit={handleEditSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                id="edit-role"
                value={editForm.role}
                onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as ManagedUserRole }))}
                options={roleOptions}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              id="edit-status"
              value={editForm.status}
              onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as ManagedUserStatus }))}
              options={statusOptions}
            />
          </div>

          {editError && <p className="text-sm text-rose-500">{editError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'email'} onClose={closeModal} title="Change email" size="lg">
        <form className="space-y-4" onSubmit={handleEmailSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email-address">Email address</Label>
            <Input
              id="email-address"
              type="email"
              value={emailForm.email}
              onChange={(event) => setEmailForm({ email: event.target.value })}
              placeholder="name@company.com"
            />
          </div>

          {emailError && <p className="text-sm text-rose-500">{emailError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">Update email</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'credits'} onClose={closeModal} title="Add credits" size="lg">
        <form className="space-y-4" onSubmit={handleCreditsSubmit}>
          <div className="space-y-2">
            <Label htmlFor="credit-amount">Credit amount</Label>
            <Input
              id="credit-amount"
              inputMode="numeric"
              value={creditsForm.amount}
              onChange={(event) => setCreditsForm({ amount: event.target.value })}
            />
            <p className="text-xs text-[var(--muted)]">Credits will be added on top of the current balance.</p>
          </div>

          {creditsError && <p className="text-sm text-rose-500">{creditsError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">
              <Coins className="h-4 w-4" /> Add credits
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'reset'} onClose={closeModal} title="Reset password" size="md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            We will send a password reset email to this user. They will need to follow the link to set a new password.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleResetConfirm}>
              <RefreshCw className="h-4 w-4" /> Send reset email
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Delete user" size="md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Are you sure you want to delete <strong>{context.user?.name}</strong>? This action cannot be undone. 
            All user data, credits, and access will be permanently removed.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              variant="ghost" 
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={handleDeleteConfirm}
            >
              <Trash2 className="h-4 w-4" /> Delete permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
