-- Izinkan user yang sudah login (authenticated) untuk mengupload (insert) gambar ke bucket chat-images
CREATE POLICY "Allow authenticated users to insert chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- Izinkan semua orang (publik) untuk melihat/membaca gambar di bucket chat-images
CREATE POLICY "Allow public to read chat images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-images');

-- Opsional: Jika butuh menghapus file chat images (oleh pembuatnya)
CREATE POLICY "Allow users to delete their own chat images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid() = owner);
