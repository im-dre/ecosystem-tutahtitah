DO $$ 
DECLARE
    con_record RECORD;
BEGIN
    -- 1. Cari dan hapus constraint Foreign Key pada kolom participant_id jika mengarah ke tabel merchants
    FOR con_record IN 
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'chats' AND column_name = 'participant_id'
    LOOP
        EXECUTE 'ALTER TABLE chats DROP CONSTRAINT IF EXISTS ' || con_record.constraint_name;
    END LOOP;

    -- 2. Cari dan hapus constraint CHECK pada kolom chat_type jika ada
    FOR con_record IN 
        SELECT constraint_name 
        FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%chat_type%'
    LOOP
        EXECUTE 'ALTER TABLE chats DROP CONSTRAINT IF EXISTS ' || con_record.constraint_name;
    END LOOP;
    
    -- Opsional: Hapus constraint constraint-lain yang ngeblokir
    EXECUTE 'ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_chat_type_check';
    EXECUTE 'ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_participant_id_fkey';
END $$;
