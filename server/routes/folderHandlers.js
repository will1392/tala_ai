import { asyncHandler } from '../utils/errorHandler.js';

export function createFolderHandlers({
  folders,
  saveFolders,
  updatePrimaryFolderCounts,
  getPrimaryFolders
}) {
  if (!folders || typeof folders.get !== 'function') {
    throw new Error('A folders Map instance is required');
  }

  const resolvePrimaryFolders = () => {
    if (typeof getPrimaryFolders === 'function') {
      return getPrimaryFolders() || new Map();
    }
    return getPrimaryFolders || new Map();
  };

  const ensureAuthenticated = (req, res) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    }
    return req.userId;
  };

  const updateFolder = async (req, res) => {
    const { folderId } = req.params;
    const { name, description } = req.body;
    const userId = ensureAuthenticated(req, res);

    if (!userId) {
      return;
    }

    const folder = folders.get(folderId);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (name) folder.name = name.trim();
    if (description !== undefined) folder.description = description?.trim();

    folders.set(folderId, folder);
    saveFolders(folders);

    console.log(`📁 Updated folder: ${folder.name} (ID: ${folderId})`);
    return res.json(folder);
  };

  const deleteFolder = async (req, res) => {
    const { folderId } = req.params;
    const userId = ensureAuthenticated(req, res);

    if (!userId) {
      return;
    }

    const folder = folders.get(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Allow deletion if:
    // 1. User owns the folder
    // 2. User has admin/owner role in request
    // 3. Folder's userId matches and folder has isAdmin flag (legacy admin folders)
    const isOwner = folder.userId === userId;
    const isRequestAdmin = req.userRole === 'admin' || req.userRole === 'owner' || req.isAdmin === true;
    const isFolderAdmin = folder.isAdmin === true;
    
    // Super admins can delete any folder, regular users can only delete their own
    const canDelete = isRequestAdmin || (isOwner && isFolderAdmin) || isOwner;
    
    if (!canDelete) {
      console.log(`❌ Delete forbidden - userId: ${userId}, folderUserId: ${folder.userId}, userRole: ${req.userRole}, isAdmin: ${req.isAdmin}, folderIsAdmin: ${folder.isAdmin}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const deletedFolderPrimaryId = folder.primaryFolderId;

    folders.delete(folderId);
    saveFolders(folders);

    if (deletedFolderPrimaryId) {
      updatePrimaryFolderCounts();
    }

    console.log(`📁 Deleted folder: ${folder.name} (ID: ${folderId}) by ${req.userRole || 'user'} ${userId}`);
    return res.json({ success: true });
  };

  const moveFolder = async (req, res) => {
    const { folderId } = req.params;
    const { newParentId, newParentType } = req.body;
    const userId = ensureAuthenticated(req, res);

    if (!userId) {
      return;
    }

    if (!newParentId || !newParentType) {
      return res.status(400).json({ error: 'newParentId and newParentType are required' });
    }

    if (!['primary', 'subfolder'].includes(newParentType)) {
      return res.status(400).json({ error: 'newParentType must be "primary" or "subfolder"' });
    }

    const folder = folders.get(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const primaryFolders = resolvePrimaryFolders();

    if (newParentType === 'primary') {
      const primaryFolder = primaryFolders.get(newParentId);
      if (!primaryFolder) {
        return res.status(404).json({ error: 'Target primary folder not found' });
      }

      if (!primaryFolder.permissions?.canCreate) {
        return res.status(403).json({ error: 'Cannot create folders in this primary folder' });
      }

      folder.primaryFolderId = newParentId;
    } else if (newParentType === 'subfolder') {
      const parentFolder = folders.get(newParentId);
      if (!parentFolder) {
        return res.status(404).json({ error: 'Target parent folder not found' });
      }

      if (newParentId === folderId) {
        return res.status(400).json({ error: 'Cannot move folder into itself' });
      }

      folder.primaryFolderId = parentFolder.primaryFolderId;
    }

    folder.updatedAt = new Date().toISOString();
    folders.set(folderId, folder);
    saveFolders(folders);

    updatePrimaryFolderCounts();

    console.log(`📁 Moved folder: ${folder.name} (ID: ${folderId}) to ${newParentType} ${newParentId}`);
    return res.json(folder);
  };

  return {
    updateFolderHandler: asyncHandler(updateFolder),
    deleteFolderHandler: asyncHandler(deleteFolder),
    moveFolderHandler: asyncHandler(moveFolder)
  };
}

export default createFolderHandlers;