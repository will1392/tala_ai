import test from 'node:test';
import assert from 'node:assert/strict';

process.env.REDIS_ENABLED = 'false';

const express = (await import('express')).default;
const { createFolderHandlers } = await import('../routes/folderHandlers.js');

function createStubAuth(userId) {
  return (req, res, next) => {
    if (userId !== undefined) {
      req.userId = userId;
    }
    next();
  };
}

function buildTestApp({ authMiddleware }) {
  const app = express();
  app.use(express.json());

  const ownerId = 'user-owner';
  const folders = new Map([
    ['folder-1', {
      id: 'folder-1',
      name: 'Owner Folder',
      description: 'Test folder',
      userId: ownerId,
      primaryFolderId: null
    }]
  ]);

  const primaryFolders = new Map([
    ['primary-1', {
      id: 'primary-1',
      name: 'Primary',
      slug: 'primary',
      permissions: { canCreate: true }
    }]
  ]);

  const saveFolders = () => {};
  const updatePrimaryFolderCounts = () => {};

  const {
    updateFolderHandler,
    deleteFolderHandler,
    moveFolderHandler
  } = createFolderHandlers({
    folders,
    saveFolders,
    updatePrimaryFolderCounts,
    getPrimaryFolders: () => primaryFolders
  });

  app.put('/api/folders/:folderId', authMiddleware, updateFolderHandler);
  app.delete('/api/folders/:folderId', authMiddleware, deleteFolderHandler);
  app.put('/api/folders/:folderId/move', authMiddleware, moveFolderHandler);

  return { app, ownerId, folders };
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

test('PUT /api/folders/:folderId returns 401 when no authenticated user is present', async () => {
  const { app } = buildTestApp({ authMiddleware: createStubAuth(undefined) });
  const { server, url } = await startServer(app);

  try {
    const response = await fetch(`${url}/api/folders/folder-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated name', userId: 'user-owner' })
    });

    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.error, 'Authentication required');
  } finally {
    await closeServer(server);
  }
});

test('DELETE /api/folders/:folderId returns 401 when no authenticated user is present', async () => {
  const { app } = buildTestApp({ authMiddleware: createStubAuth(undefined) });
  const { server, url } = await startServer(app);

  try {
    const response = await fetch(`${url}/api/folders/folder-1`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-owner' })
    });

    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.error, 'Authentication required');
  } finally {
    await closeServer(server);
  }
});

test('PUT /api/folders/:folderId/move returns 401 when no authenticated user is present', async () => {
  const { app } = buildTestApp({ authMiddleware: createStubAuth(undefined) });
  const { server, url } = await startServer(app);

  try {
    const response = await fetch(`${url}/api/folders/folder-1/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newParentId: 'primary-1',
        newParentType: 'primary',
        userId: 'user-owner'
      })
    });

    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.error, 'Authentication required');
  } finally {
    await closeServer(server);
  }
});

test('folder routes return 403 when authenticated user does not own the folder', async () => {
  const authMiddleware = createStubAuth('user-other');
  const { app } = buildTestApp({ authMiddleware });
  const { server, url } = await startServer(app);

  try {
    const updateResponse = await fetch(`${url}/api/folders/folder-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized rename' })
    });
    assert.equal(updateResponse.status, 403);

    const deleteResponse = await fetch(`${url}/api/folders/folder-1`, {
      method: 'DELETE'
    });
    assert.equal(deleteResponse.status, 403);

    const moveResponse = await fetch(`${url}/api/folders/folder-1/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newParentId: 'primary-1', newParentType: 'primary' })
    });
    assert.equal(moveResponse.status, 403);
  } finally {
    await closeServer(server);
  }
});

test('folder routes succeed when authenticated owner performs the action', async () => {
  const ownerId = 'user-owner';
  const authMiddleware = createStubAuth(ownerId);
  const { app, folders } = buildTestApp({ authMiddleware });
  const { server, url } = await startServer(app);

  try {
    const updateResponse = await fetch(`${url}/api/folders/folder-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Folder Name' })
    });
    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json();
    assert.equal(updated.name, 'Updated Folder Name');

    const moveResponse = await fetch(`${url}/api/folders/folder-1/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newParentId: 'primary-1', newParentType: 'primary' })
    });
    assert.equal(moveResponse.status, 200);
    const moved = await moveResponse.json();
    assert.equal(moved.primaryFolderId, 'primary-1');

    const deleteResponse = await fetch(`${url}/api/folders/folder-1`, {
      method: 'DELETE'
    });
    assert.equal(deleteResponse.status, 200);
    const deletion = await deleteResponse.json();
    assert.ok(deletion.success);

    assert.equal(folders.has('folder-1'), false);
  } finally {
    await closeServer(server);
  }
});