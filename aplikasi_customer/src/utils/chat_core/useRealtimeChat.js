import { useCallback, useEffect, useState } from 'react';
import {
  MESSAGE_COLUMNS,
  normalizeChatMessage,
  normalizeChatMessages,
} from './chatNormalizer';

const DEFAULT_LIMIT = 200;

export default function useRealtimeChat({
  supabase,
  chatId,
  limit = DEFAULT_LIMIT,
  defaultSenderName,
  enabled = true,
} = {}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalize = useCallback(
    (message) => normalizeChatMessage(message, { defaultSenderName }),
    [defaultSenderName],
  );

  const fetchMessages = useCallback(async () => {
    if (!supabase || !chatId || !enabled) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .eq('chat_id', chatId)
      .eq('is_deleted_by_customer', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (fetchError) {
      setError(fetchError);
      setMessages([]);
    } else {
      setMessages(normalizeChatMessages(data || [], { defaultSenderName }));
    }
    setIsLoading(false);
  }, [chatId, defaultSenderName, enabled, limit, supabase]);

  useEffect(() => {
    if (!supabase || !chatId || !enabled) {
      setMessages([]);
      return undefined;
    }

    void fetchMessages();
    const channel = supabase
      .channel(`shared-chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        if (!payload.new?.id) return;
        const incoming = normalize(payload.new);
        setMessages((current) => current.some((message) => message.id === incoming.id)
          ? current
          : [...current, incoming]);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        if (!payload.new?.id) return;
        const incoming = normalize(payload.new);
        setMessages((current) => current.some((message) => message.id === incoming.id)
          ? current.map((message) => message.id === incoming.id ? { ...message, ...incoming } : message)
          : [...current, incoming]);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId, enabled, fetchMessages, normalize, supabase]);

  const addOptimisticMessage = useCallback((message) => {
    const normalized = normalize(message);
    setMessages((current) => current.some((item) => item.id === normalized.id)
      ? current
      : [...current, normalized]);
    return normalized;
  }, [normalize]);

  const replaceMessage = useCallback((temporaryId, message) => {
    const normalized = normalize(message);
    setMessages((current) => current.some((item) => item.id === normalized.id)
      ? current.filter((item) => item.id !== temporaryId)
      : current.map((item) => item.id === temporaryId ? normalized : item));
  }, [normalize]);

  const removeMessage = useCallback((messageId) => {
    setMessages((current) => current.filter((message) => message.id !== messageId));
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    error,
    fetchMessages,
    addOptimisticMessage,
    replaceMessage,
    removeMessage,
  };
}