if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Chưa điền SUPABASE_URL / SUPABASE_ANON_KEY trong config.js");
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  search: "",
  genre: "all",
  status: "all",
  page: 1,
  perPage: 12,
  comics: [],
  session: null,
  bookmarks: new Set(),
};

const el = {
  grid: document.getElementById("grid"),
  pagination: document.getElementById("pagination"),
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  genreSelect: document.getElementById("genreSelect"),
  statusSelect: document.getElementById("statusSelect"),
  modal: document.getElementById("modal"),
  modalClose: document.getElementById("modalClose"),
  modalCover: document.getElementById("modalCover"),
  modalTitle: document.getElementById("modalTitle"),
  modalMeta: document.getElementById("modalMeta"),
  modalDesc: document.getElementById("modalDesc"),
  modalGenres: document.getElementById("modalGenres"),
  modalAuthor: document.getElementById("modalAuthor"),
  modalStatus: document.getElementById("modalStatus"),
  modalBookmarkInfo: document.getElementById("modalBookmarkInfo"),
  bookmarkBtn: document.getElementById("bookmarkBtn"),
  cardTemplate: document.getElementById("cardTemplate"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  userInfo: document.getElementById("userInfo"),
  authModal: document.getElementById("authModal"),
  authClose: document.getElementById("authClose"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  doLogin: document.getElementById("doLogin"),
  doSignup: document.getElementById("doSignup"),
  authMessage: document.getElementById("authMessage"),
};

function formatNumber(n) { return (n || 0).toLocaleString("vi-VN"); }
function formatDate(str) { return str ? new Date(str).toLocaleDateString("vi-VN") : ""; }

async function fetchComics() {
  const { data, error } = await sb
    .from("comics")
    .select("id,title,cover,genres,chapters,views,updated_at,description,author,status")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error(error);
    alert("Lỗi tải dữ liệu: " + error.message);
    return;
  }
  state.comics = data || [];
  initGenres();
  renderGrid();
}

function initGenres() {
  const genres = new Set();
  state.comics.forEach((c) => (c.genres || []).forEach((g) => genres.add(g)));
  const opts = ["Tất cả", ...Array.from(genres)];
  el.genreSelect.innerHTML = opts
    .map((g) => `<option value="${g === "Tất cả" ? "all" : g}">${g}</option>`) 
    .join("");
}

function filterData() {
  return state.comics.filter((c) => {
    const title = (c.title || "").toLowerCase();
    const matchText = title.includes(state.search.toLowerCase());
    const matchGenre = state.genre === "all" || (c.genres || []).includes(state.genre);
    const matchStatus = state.status === "all" || c.status === state.status;
    return matchText && matchGenre && matchStatus;
  });
}

function renderGrid() {
  const data = filterData();
  const start = (state.page - 1) * state.perPage;
  const pageItems = data.slice(start, start + state.perPage);
  el.grid.innerHTML = "";

  pageItems.forEach((comic) => {
    const node = el.cardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".cover").src = comic.cover;
    node.querySelector(".title").textContent = comic.title;
    node.querySelector(".chapters").textContent = `Ch ${comic.chapters || 0}`;
    node.querySelector(".views").textContent = `${formatNumber(comic.views)} lượt xem`;
    node.querySelector(".updated").textContent = `Cập nhật: ${formatDate(comic.updated_at)}`;
    node.querySelector(".badge").textContent = comic.status === "completed" ? "Hoàn thành" : "Đang ra";
    node.addEventListener("click", () => openModal(comic));
    el.grid.appendChild(node);
  });

  renderPagination(data.length);
}

function renderPagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(state.page, totalPages);
  el.pagination.innerHTML = "";

  const makeBtn = (page, label = page, disabled = false, active = false) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (active) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.page = page;
      renderGrid();
    });
    return btn;
  };

  el.pagination.appendChild(makeBtn(Math.max(1, state.page - 1), "←", state.page === 1));
  for (let i = 1; i <= totalPages; i++) {
    el.pagination.appendChild(makeBtn(i, i, false, i === state.page));
  }
  el.pagination.appendChild(makeBtn(Math.min(totalPages, state.page + 1), "→", state.page === totalPages));
}

function openModal(comic) {
  el.modalCover.src = comic.cover;
  el.modalTitle.textContent = comic.title;
  el.modalMeta.textContent = `Chapters: ${comic.chapters || 0} | ${formatNumber(comic.views)} lượt xem | Cập nhật: ${formatDate(comic.updated_at)}`;
  el.modalDesc.textContent = comic.description || "";
  el.modalAuthor.textContent = comic.author || "";
  el.modalStatus.textContent = comic.status === "completed" ? "Đã hoàn thành" : "Đang ra";
  el.modalGenres.innerHTML = (comic.genres || []).map((g) => `<span class="chip">${g}</span>`).join("");
  el.bookmarkBtn.onclick = () => toggleBookmark(comic.id);
  updateBookmarkInfo(comic.id);
  el.modal.classList.remove("hidden");
}

function closeModal() { el.modal.classList.add("hidden"); }

document.addEventListener("click", (e) => { if (e.target === el.modal) closeModal(); if (e.target === el.authModal) closeAuth(); });
el.modalClose.addEventListener("click", closeModal);

el.searchBtn.addEventListener("click", () => { state.search = el.searchInput.value.trim(); state.page = 1; renderGrid(); });
el.searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { state.search = el.searchInput.value.trim(); state.page = 1; renderGrid(); } });
el.genreSelect.addEventListener("change", (e) => { state.genre = e.target.value; state.page = 1; renderGrid(); });
el.statusSelect.addEventListener("change", (e) => { state.status = e.target.value; state.page = 1; renderGrid(); });

// Auth modal
function openAuth() { el.authModal.classList.remove("hidden"); }
function closeAuth() { el.authModal.classList.add("hidden"); el.authMessage.textContent = ""; }
el.loginBtn.addEventListener("click", openAuth);
el.authClose.addEventListener("click", closeAuth);

async function handleLogin(isSignup = false) {
  const email = el.authEmail.value.trim();
  const password = el.authPassword.value.trim();
  if (!email || !password) return (el.authMessage.textContent = "Điền email/mật khẩu");
  el.authMessage.textContent = isSignup ? "Đang đăng ký..." : "Đang đăng nhập...";
  const fn = isSignup ? sb.auth.signUp : sb.auth.signInWithPassword;
  const { error } = await fn({ email, password });
  if (error) { el.authMessage.textContent = error.message; return; }
  el.authMessage.textContent = "Thành công. Kiểm tra email nếu cần xác thực.";
}

el.doLogin.addEventListener("click", () => handleLogin(false));
el.doSignup.addEventListener("click", () => handleLogin(true));

el.logoutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
});

function updateUIForSession() {
  if (state.session) {
    el.loginBtn.classList.add("hidden");
    el.logoutBtn.classList.remove("hidden");
    el.userInfo.classList.remove("hidden");
    el.userInfo.textContent = state.session.user.email;
  } else {
    el.loginBtn.classList.remove("hidden");
    el.logoutBtn.classList.add("hidden");
    el.userInfo.classList.add("hidden");
    el.userInfo.textContent = "";
  }
}

async function getSessionAndBookmarks() {
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  updateUIForSession();
  await loadBookmarks();
}

async function loadBookmarks() {
  state.bookmarks = new Set();
  if (!state.session) return;
  const { data, error } = await sb
    .from("bookmarks")
    .select("comic_id")
    .eq("user_id", state.session.user.id);
  if (error) { console.warn(error); return; }
  data.forEach((b) => state.bookmarks.add(b.comic_id));
}

function updateBookmarkInfo(comicId) {
  const isSaved = state.bookmarks.has(comicId);
  el.modalBookmarkInfo.textContent = state.session
    ? (isSaved ? "Đã bookmark" : "Nhấn để lưu bookmark")
    : "Đăng nhập để bookmark";
}

async function toggleBookmark(comicId) {
  if (!state.session) { openAuth(); return; }
  const isSaved = state.bookmarks.has(comicId);
  if (isSaved) {
    const { error } = await sb
      .from("bookmarks")
      .delete()
      .eq("user_id", state.session.user.id)
      .eq("comic_id", comicId);
    if (!error) state.bookmarks.delete(comicId);
  } else {
    const { error } = await sb
      .from("bookmarks")
      .insert({ user_id: state.session.user.id, comic_id: comicId });
    if (!error) state.bookmarks.add(comicId);
  }
  updateBookmarkInfo(comicId);
}

// Listen auth changes
sb.auth.onAuthStateChange((_event, session) => {
  state.session = session;
  updateUIForSession();
  loadBookmarks();
});

// Init
getSessionAndBookmarks();
fetchComics();
