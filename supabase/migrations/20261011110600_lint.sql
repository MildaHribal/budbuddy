-- Linter: pin search_path on the media URL helper.
alter function private.media_url_ok(text, uuid) set search_path = '';
