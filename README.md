# NetTruyen Supabase (Auth + DB)

Giao diện NetTruyen + Supabase (Auth/DB) phía client. Bạn chỉ cần tạo project Supabase, điền URL + anon key, tạo bảng theo SQL bên dưới là chạy.

## Cấu trúc
- `index.html` — trang chính
- `styles.css` — giao diện
- `config.js` — điền `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `app.js` — logic fetch DB, auth, bookmark

## Chuẩn bị Supabase
1) Đăng ký/đăng nhập: https://supabase.com
2) New Project → đặt tên, chọn region → tạo.
3) Vào **Project Settings → API**: copy `Project URL` và `anon public key` → dán vào `config.js`.
4) Tạo bảng bằng SQL (SQL Editor → New query):
```sql
-- Bảng comics
create table public.comics (
  id bigint generated always as identity primary key,
  title text not null,
  cover text,
  genres text[] default '{}',
  chapters int default 0,
  views int default 0,
  updated_at timestamptz default now(),
  description text,
  author text,
  status text check (status in ('ongoing','completed')) default 'ongoing'
);

-- Bảng bookmarks
create table public.bookmarks (
  user_id uuid references auth.users on delete cascade,
  comic_id bigint references public.comics(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, comic_id)
);

-- Cho phép anon (client) đọc comics, bookmark; chỉ user login mới ghi bookmark
alter table public.comics enable row level security;
alter table public.bookmarks enable row level security;

create policy "comics_read" on public.comics for select using (true);

create policy "bookmarks_select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete using (auth.uid() = user_id);
```

5) Thêm dữ liệu mẫu (SQL):
```sql
insert into public.comics (title, cover, genres, chapters, views, description, author, status)
values
('Đế Vương Trùng Sinh', 'https://picsum.photos/seed/comic1/300/450', '{"Tiên hiệp","Hành động"}', 220, 124000, 'Hoàng đế trùng sinh...', 'Nguyệt Vân', 'ongoing'),
('Học Viện Anh Hùng', 'https://picsum.photos/seed/comic2/300/450', '{"Học đường","Hài hước"}', 156, 88000, 'Lò luyện anh hùng...', 'Red Studio', 'ongoing');
```

## Chạy local
- Mở `index.html` (double-click) hoặc `npx serve` trong thư mục để chạy server tĩnh.
- Nhập search/lọc, click truyện để xem popup, đăng nhập/đăng ký, bookmark.

## Deploy nhanh
- Vercel/Netlify: upload folder này (hoặc đẩy lên GitHub rồi deploy). Là site tĩnh, chỉ cần file HTML/JS/CSS.
- Nhớ cấu hình domain nếu cần.

## Mở rộng
- Thêm upload ảnh: dùng Supabase Storage (bucket public) và lưu URL vào `cover`.
- Thêm phân trang server-side: dùng `.range()` khi select.
- Thêm vai trò admin: tạo bảng `roles` hoặc dùng `auth.users` + `app_metadata` để phân quyền insert/update comics.
