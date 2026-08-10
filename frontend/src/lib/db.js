import Dexie from 'dexie';

export const db = new Dexie('hypergym_db');

db.version(1).stores({
    workouts: '++id, localId, userId, startedAt, synced', // Synced flag
    syncQueue: '++id, action, payload, createdAt' // Queue for mutations
});

export async function addWorkout(workout) {
    // Generate local ID if needed, store locally
    const localId = crypto.randomUUID();
    await db.workouts.add({
        ...workout,
        localId,
        synced: 0, // Not synced
        startedAt: new Date().toISOString()
    });
    // Add to queue for sync attempt
    await db.syncQueue.add({
        action: 'CREATE_WORKOUT',
        payload: { ...workout, localId },
        createdAt: new Date().toISOString()
    });
}
