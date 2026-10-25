/**
 * Columns shared by every chat client. Keep this list explicit to avoid
 * fetching columns that a chat consumer does not need.
 */
export const MESSAGE_COLUMNS = [
  'id',
  'chat_id',
  'sender_id',
  'sender_type',
  'content',
  'metadata',
  'is_read',
  'created_at',
  'is_deleted_by_customer',
  'is_deleted_by_participant',
].join(', ');

const DEFAULT_SENDER_NAME = 'Pengguna';

function parseMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object' && !Array.isArray(metadata)) return metadata;
  if (typeof metadata !== 'string') return {};

  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getDefaultSenderName(senderType, fallback) {
  if (fallback) return fallback;
  if (senderType === 'customer') return 'Customer';
  if (senderType === 'merchant') return 'UMKM';
  if (senderType === 'courier') return 'Kurir';
  if (senderType === 'admin' || senderType === 'internal') return 'Admin/Kurir';
  return DEFAULT_SENDER_NAME;
}

/**
 * Converts a database/optimistic message into the shared chat contract.
 * Metadata is always an object and sender_name is always a non-empty string.
 */
export function normalizeChatMessage(message = {}, options = {}) {
  const metadata = parseMetadata(message.metadata);
  const senderName = [
    metadata.sender_name,
    message.sender_name,
    options.defaultSenderName,
  ].find((value) => typeof value === 'string' && value.trim());

  return {
    ...message,
    metadata,
    sender_name: senderName?.trim() || getDefaultSenderName(message.sender_type, options.defaultSenderName),
  };
}

export function normalizeChatMessages(messages = [], options = {}) {
  const seenIds = new Set();
  return messages
    .map((message) => normalizeChatMessage(message, options))
    .filter((message) => {
      if (!message.id || seenIds.has(message.id)) return false;
      seenIds.add(message.id);
      return true;
    });
}
