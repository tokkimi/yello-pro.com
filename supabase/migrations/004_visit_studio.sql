-- Allow voice notes captured during visits to be stored in the private documents
-- bucket. Records stay generic (jsonb): transcripts and material selections live
-- in records.data, so no table change is required.
update storage.buckets
 set allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav']
 where id='documents';
