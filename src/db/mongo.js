import mongoose from 'mongoose';

let lastError = null;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    lastError = 'MONGODB_URI is not set';
    console.log('[Mongo] MONGODB_URI missing - skipping connection');
    return { connected: false, error: lastError };
  }

  const maxAttempts = 5;
  const backoffMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        family: 4
      });
      lastError = null;
      console.log(`[Mongo] connected (attempt ${attempt})`);
      return { connected: true };
    } catch (err) {
      lastError = err?.message || String(err);
      console.error(`[Mongo] connect failed (attempt ${attempt}/${maxAttempts}): ${lastError}`);
      if (attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  const connected = mongoose.connection?.readyState === 1;
  return { connected, error: connected ? null : (lastError || 'Unknown connection error') };
}

export function getMongoStatus() {
  const ready = mongoose.connection?.readyState;
  const connected = ready === 1; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  return {
    connected,
    error: connected
      ? null
      : (lastError || (!process.env.MONGODB_URI ? 'MONGODB_URI not set' : 'Not connected'))
  };
}
