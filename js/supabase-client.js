// Koneksi ke Supabase — project "ps-msp-website"
// anon key ini AMAN untuk publik (memang didesain begitu), keamanan data
// diatur lewat Row Level Security (RLS) policy yang sudah dibuat di database.
// JANGAN PERNAH taruh "service_role key" di sini atau di file manapun yang
// ter-upload ke GitHub — itu kunci rahasia dengan akses penuh ke database.

const SUPABASE_URL = 'https://iqcpqldmmglbkjcoahot.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxY3BxbGRtbWdsYmtqY29haG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTE0MzksImV4cCI6MjA5OTgyNzQzOX0.16asXsuwqdNcZ1ssiNcaaXHK8rJw2OsoigV6NWPxlRg';

// `supabase` di baris berikut adalah objek global dari library CDN
// (@supabase/supabase-js) yang di-load SEBELUM file ini di setiap halaman HTML.
// Kita simpan client hasil koneksinya ke `window.sbClient` supaya tidak
// bentrok nama dengan objek library aslinya.
window.sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
