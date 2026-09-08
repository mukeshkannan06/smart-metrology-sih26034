import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './index';

export type DatabaseStatus = 'connected' | 'disconnected' | 'connecting' | 'disconnecting';

/**
 * Sanitizes MongoDB URI for logging to prevent password/credential leakage
 */
export const sanitizeMongoUri = (uri?: string): string => {
  if (!uri) return '[NOT_CONFIGURED]';
  try {
    // Mask password in mongodb:// or mongodb+srv://
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  } catch {
    return '[MASKED_URI]';
  }
};

/**
 * Connects to MongoDB Atlas using Mongoose with robust timeout and pool settings
 */
export const connectDatabase = async (): Promise<boolean> => {
  const uri = config.mongodbUri;

  if (!uri || uri.trim() === '') {
    console.warn('⚠️  [DATABASE] MONGODB_URI is not set in backend/.env.');
    console.warn('⚠️  [DATABASE] Server running in disconnected DB mode. MongoDB Atlas connection is pending.');
    console.warn('👉  [DATABASE] See docs/mongodb-atlas-setup.md for setup instructions.');
    return false;
  }

  // Prevent multiple connections
  if (mongoose.connection.readyState === 1) {
    console.log('[DATABASE] Already connected to MongoDB Atlas.');
    return true;
  }

  try {
    const maskedUri = sanitizeMongoUri(uri);
    console.log(`[DATABASE] Connecting to MongoDB Atlas: ${maskedUri}...`);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      dbName: 'smart_metrology',
    });

    console.log('✅ [DATABASE] MongoDB Atlas connected successfully.');
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';

    // Handle Windows/ISP DNS SRV resolution failure (ECONNREFUSED) by retrying with public DNS
    if (message.includes('querySrv ECONNREFUSED') || message.includes('querySrv ETIMEOUT')) {
      console.warn('⚠️  [DATABASE] Local DNS resolver refused SRV query. Retrying with Google Public DNS (8.8.8.8)...');
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
          maxPoolSize: 10,
          dbName: 'smart_metrology',
        });
        console.log('✅ [DATABASE] MongoDB Atlas connected successfully via Public DNS.');
        return true;
      } catch (retryErr: unknown) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : 'Unknown database error';
        console.error('❌ [DATABASE] Failed to connect to MongoDB Atlas after DNS fallback:', retryMsg);
        return false;
      }
    }

    console.error('❌ [DATABASE] Failed to connect to MongoDB Atlas:', message);
    console.warn('👉 [DATABASE] Verify that your IP address is whitelisted in MongoDB Atlas Network Access.');
    return false;
  }
};

/**
 * Cleanly disconnects from MongoDB on process shutdown
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('[DATABASE] Mongoose disconnected gracefully.');
    } catch (err) {
      console.error('[DATABASE] Error during Mongoose disconnect:', err);
    }
  }
};

/**
 * Returns current database health without leaking sensitive connection details
 */
export const getDatabaseHealth = (): {
  status: DatabaseStatus;
  readyState: number;
  databaseName?: string;
} => {
  const readyState = mongoose.connection.readyState;
  let status: DatabaseStatus = 'disconnected';

  switch (readyState) {
    case 1:
      status = 'connected';
      break;
    case 2:
      status = 'connecting';
      break;
    case 3:
      status = 'disconnecting';
      break;
    default:
      status = 'disconnected';
      break;
  }

  return {
    status,
    readyState,
    ...(status === 'connected' && mongoose.connection.db
      ? { databaseName: mongoose.connection.db.databaseName }
      : {}),
  };
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

