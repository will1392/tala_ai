import React, { useEffect, useState } from 'react';
import {
  Search,
  Shield,
  Building2,
  PencilLine,
  Ban,
  CheckCircle,
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
import { organizationService, type Organization } from '../../services/organizationService';
import { cn } from '../../utils/cn';

type ModalType = 'create' | 'edit' | 'delete' | null;

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function OrganizationManagement() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('active');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    type: 'agency'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    type: 'agency',
    isActive: true
  });

  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <Shield className="h-16 w-16 text-gray-400 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-[var(--muted)]">
              You don't have permission to access Organization Management. This feature is only available to super administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const isActiveFilter = activeFilter === 'all' ? undefined : activeFilter === 'active';
      const response = await organizationService.listOrganizations({
        page: 1,
        limit: 100,
        isActive: isActiveFilter
      });
      
      if (response.success && response.data) {
        setOrganizations(response.data);
      } else {
        setFeedback({ type: 'error', message: response.error || 'Failed to load organizations' });
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      setFeedback({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [activeFilter]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const filteredOrgs = organizations.filter((org) => {
    const matchesType = typeFilter === 'all' || org.type === typeFilter;
    const matchesSearch =
      searchTerm.trim().length === 0 ||
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const selectedOrg = selectedOrgId
    ? organizations.find((org) => org.id === selectedOrgId)
    : null;

  const closeModal = () => {
    setActiveModal(null);
    setCreateError(null);
    setEditError(null);
  };

  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      slug: '',
      type: 'agency'
    });
    setCreateError(null);
    setActiveModal('create');
  };

  const handleOpenEdit = (org: Organization) => {
    setSelectedOrgId(org.id);
    setEditForm({
      name: org.name,
      slug: org.slug,
      type: org.type,
      isActive: org.is_active
    });
    setEditError(null);
    setActiveModal('edit');
  };

  const handleOpenDelete = (org: Organization) => {
    setSelectedOrgId(org.id);
    setActiveModal('delete');
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const trimmedName = createForm.name.trim();
    const trimmedSlug = createForm.slug.trim() || slugify(trimmedName);

    if (!trimmedName) {
      setCreateError('Organization name is required.');
      return;
    }

    if (!trimmedSlug) {
      setCreateError('Organization slug is required.');
      return;
    }

    if (organizations.some((org) => org.slug === trimmedSlug)) {
      setCreateError('An organization with this slug already exists.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await organizationService.createOrganization({
        name: trimmedName,
        slug: trimmedSlug,
        type: createForm.type
      });

      if (!response.success || !response.data) {
        setCreateError(response.error || 'Failed to create organization. Please try again.');
        return;
      }

      setFeedback({
        type: 'success',
        message: `${response.data.name} was created successfully.`
      });
      closeModal();
      loadOrganizations();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditError(null);

    if (!selectedOrgId) {
      setEditError('No organization selected.');
      return;
    }

    const trimmedName = editForm.name.trim();
    const trimmedSlug = editForm.slug.trim();

    if (!trimmedName) {
      setEditError('Organization name is required.');
      return;
    }

    if (!trimmedSlug) {
      setEditError('Organization slug is required.');
      return;
    }

    const existingOrg = organizations.find((org) => org.slug === trimmedSlug && org.id !== selectedOrgId);
    if (existingOrg) {
      setEditError('An organization with this slug already exists.');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await organizationService.updateOrganization(selectedOrgId, {
        name: trimmedName,
        slug: trimmedSlug,
        type: editForm.type,
        isActive: editForm.isActive
      });

      if (!response.success || !response.data) {
        setEditError(response.error || 'Failed to update organization. Please try again.');
        return;
      }

      setFeedback({
        type: 'success',
        message: `${response.data.name} was updated successfully.`
      });
      closeModal();
      loadOrganizations();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedOrgId) {
      setFeedback({ type: 'error', message: 'No organization selected.' });
      closeModal();
      return;
    }

    const org = organizations.find((o) => o.id === selectedOrgId);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--fg)]">Organization Management</h1>
          <p className="text-sm text-[var(--muted)]">
            Manage organizations and their knowledge base access.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="whitespace-nowrap">
          <Building2 className="h-4 w-4" /> Create Organization
        </Button>
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
                  Organizations
                </CardTitle>
                <CardDescription>
                  {filteredOrgs.length} {filteredOrgs.length === 1 ? 'organization' : 'organizations'} found
                </CardDescription>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input
                placeholder="Search by name or slug"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                startIcon={<Search className="h-4 w-4" />}
              />
              <Select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                options={[{ value: 'all', label: 'All types' }, ...typeOptions]}
                className="w-full lg:w-[180px]"
              />
              <Select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                options={[
                  { value: 'all', label: 'All status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                className="w-full lg:w-[180px]"
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
                No organizations match your filters.
              </div>
            )}

            {!isLoadingOrgs && filteredOrgs.map((org) => {
              const isActive = selectedOrgId === org.id;
              const isParent = org.type === 'parent' || org.slug === 'tala-ai';

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
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)]/30 text-sm font-semibold text-[var(--fg)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-[var(--fg)] flex items-center gap-2">
                            {org.name}
                            {isParent && (
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                (Parent)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{org.slug}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 font-medium',
                              org.type === 'parent'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                                : org.type === 'enterprise'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-200'
                                : 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200'
                            )}
                          >
                            {typeOptions.find((t) => t.value === org.type)?.label || org.type}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 font-medium',
                              org.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                            )}
                          >
                            {org.is_active ? 'Active' : 'Inactive'}
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
              Organization Details
            </CardTitle>
            <CardDescription>Select an organization to view quick actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedOrg && (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--muted)]">
                Choose an organization from the list to manage its details.
              </div>
            )}

            {selectedOrg && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">{selectedOrg.name}</h3>
                    <p className="text-sm text-[var(--muted)]">{selectedOrg.slug}</p>
                  </div>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Type</p>
                    <p className="text-base font-medium text-[var(--fg)]">
                      {typeOptions.find((t) => t.value === selectedOrg.type)?.label || selectedOrg.type}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Status</p>
                    <p className="text-base font-medium text-[var(--fg)]">
                      {selectedOrg.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Created</p>
                    <p className="text-sm text-[var(--fg)]">{formatDate(selectedOrg.created_at)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] px-4 py-3">
                    <p className="text-[var(--muted)]">Last Updated</p>
                    <p className="text-sm text-[var(--fg)]">{formatDate(selectedOrg.updated_at)}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button variant="secondary" onClick={() => handleOpenEdit(selectedOrg)}>
                    <PencilLine className="h-4 w-4" /> Edit Organization
                  </Button>
                  {selectedOrg.slug !== 'tala-ai' && selectedOrg.type !== 'parent' && (
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => handleOpenDelete(selectedOrg)}
                    >
                      <Ban className="h-4 w-4" /> Deactivate Organization
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={activeModal === 'create'} onClose={closeModal} title="Create Organization" size="lg">
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Organization Name</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setCreateForm((prev) => ({
                    ...prev,
                    name,
                    slug: prev.slug || slugify(name)
                  }));
                }}
                placeholder="Acme Travel Agency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">Slug</Label>
              <Input
                id="create-slug"
                value={createForm.slug}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))
                }
                placeholder="acme-travel-agency"
              />
              <p className="text-xs text-[var(--muted)]">
                URL-friendly identifier (auto-generated from name if left empty)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-type">Type</Label>
              <Select
                id="create-type"
                value={createForm.type}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value }))}
                options={typeOptions.filter((opt) => opt.value !== 'parent')}
              />
            </div>
          </div>

          {createError && <p className="text-sm text-rose-500">{createError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'edit'} onClose={closeModal} title="Edit Organization" size="lg">
        <form className="space-y-4" onSubmit={handleEditSubmit}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Acme Travel Agency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={editForm.slug}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))
                }
                placeholder="acme-travel-agency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                id="edit-type"
                value={editForm.type}
                onChange={(event) => setEditForm((prev) => ({ ...prev, type: event.target.value }))}
                options={typeOptions}
                disabled={selectedOrg?.type === 'parent' || selectedOrg?.slug === 'tala-ai'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-active">Status</Label>
              <Select
                id="edit-active"
                value={editForm.isActive ? 'active' : 'inactive'}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
                }
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </div>
          </div>

          {editError && <p className="text-sm text-rose-500">{editError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Deactivate Organization" size="md">
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
              onClick={handleDeleteConfirm}
            >
              <Ban className="h-4 w-4" /> Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
