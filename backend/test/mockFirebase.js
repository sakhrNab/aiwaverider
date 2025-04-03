// Mock Firebase implementation for testing
const admin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date(),
      increment: (value) => value
    },
    FieldPath: {
      documentId: () => 'id'
    }
  },
  auth: () => ({
    verifyIdToken: () => Promise.resolve({ uid: 'test-user' })
  })
};

const db = {
  collection: (name) => ({
    doc: (id) => ({
      get: () => Promise.resolve({
        exists: id === 'agent-1',
        id: id || 'agent-1',
        data: () => ({
          name: 'Test Agent',
          description: 'A test agent for unit testing',
          category: 'Test',
          price: 9.99,
          downloadCount: 42,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
        ref: {
          collection: () => ({
            get: () => Promise.resolve({
              forEach: (cb) => {}, // Empty forEach as we don't need subcollections
              empty: true
            })
          })
        }
      }),
      update: () => Promise.resolve(true),
      set: () => Promise.resolve(true),
      delete: () => Promise.resolve(true),
      collection: () => ({
        doc: () => ({
          set: () => Promise.resolve(true)
        }),
        get: () => Promise.resolve({
          forEach: (cb) => {}, // Empty forEach as we don't need subcollections
          empty: true
        })
      })
    }),
    where: () => ({
      where: () => ({
        limit: () => ({
          get: () => Promise.resolve({
            forEach: (cb) => {},
            empty: true
          })
        }),
        get: () => Promise.resolve({
          forEach: (cb) => {},
          empty: true
        })
      }),
      limit: () => ({
        get: () => Promise.resolve({
          forEach: (cb) => {},
          empty: true
        })
      }),
      orderBy: () => ({
        limit: () => ({
          get: () => Promise.resolve({
            forEach: (cb) => {},
            empty: true
          })
        })
      }),
      get: () => Promise.resolve({
        forEach: (cb) => {},
        empty: true
      })
    }),
    get: () => Promise.resolve({
      forEach: (cb) => cb({
        id: 'agent-1',
        data: () => ({
          name: 'Test Agent',
          description: 'A test agent for unit testing',
          category: 'Test',
          price: 9.99,
          rating: { average: 4.5 },
          downloadCount: 42
        })
      }),
      empty: false
    }),
    add: () => Promise.resolve({ id: 'new-agent-id' })
  }),
  runTransaction: (fn) => Promise.resolve(fn({ 
    get: () => Promise.resolve({
      exists: true,
      data: () => ({
        downloadCount: 42
      })
    }),
    update: () => Promise.resolve(true)
  })),
  batch: () => ({
    set: () => ({}),
    update: () => ({}),
    delete: () => ({}),
    commit: () => Promise.resolve()
  })
};

// Export the mock implementation
module.exports = { db, admin }; 