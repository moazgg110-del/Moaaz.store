// --- إعدادات Supabase ---
const SUPABASE_URL = "https://yhvqevgwudbsyptubaae.supabase.co";
const SUPABASE_KEY = "sb_publishable_pm4EGKlp8jzs6_2AUa5Btw_DyKlZ1vo";

let supabaseClient = null;
if (SUPABASE_URL !== "" && SUPABASE_KEY !== "" && typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// قائمة التطبيقات فارغة بالكامل كودياً وتنتظر جلب بيانات Supabase
let appsData = [];
let favorites = JSON.parse(localStorage.getItem('moaz_store_favs')) || [];
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
  fetchAppsFromSupabase();
  updateFavCount();

  document.getElementById('searchInput').addEventListener('input', renderApps);
});

// جلب التطبيقات من قاعدة بيانات Supabase
async function fetchAppsFromSupabase() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const emptyText = document.getElementById('emptyText');

  loadingState.style.display = 'block';
  emptyState.style.display = 'none';

  if (!supabaseClient) {
    loadingState.style.display = 'none';
    emptyState.style.display = 'block';
    emptyText.textContent = "يرجى وضع رابط ومفتاح Supabase الخاص بك ليتم عرض تطبيقاتك!";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('apps')
      .select('*')
      .order('created_at', { ascending: false });

    loadingState.style.display = 'none';

    if (error) {
      console.error('Supabase Error:', error);
      emptyState.style.display = 'block';
      emptyText.textContent = "حدث خطأ أثناء الاتصال بـ Supabase! تأكد من إنشاء جدول apps.";
      return;
    }

    appsData = data || [];
    document.getElementById('totalAppsCount').textContent = appsData.length;
    renderApps();

  } catch (err) {
    loadingState.style.display = 'none';
    console.error(err);
    emptyState.style.display = 'block';
    emptyText.textContent = "تعذر الاتصال بقاعدة البيانات!";
  }
}

// اختيار أيقونة احتياطية ذكية حسب الفئة إذا كان رابط الصورة مكسوراً أو فارغاً
function getSmartFallbackIcon(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('لعب') || cat.includes('game')) {
    return 'fa-gamepad';
  } else if (cat.includes('أدوا') || cat.includes('tool')) {
    return 'fa-wrench';
  } else if (cat.includes('تسل') || cat.includes('fun')) {
    return 'fa-face-smile';
  } else if (cat.includes('فيديو') || cat.includes('ميديا')) {
    return 'fa-play-circle';
  }
  return 'fa-mobile-screen-button'; // أيقونة تطبيق عامة
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tabAll').classList.toggle('active', tab === 'all');
  document.getElementById('tabFav').classList.toggle('active', tab === 'fav');
  renderApps();
}

function updateFavCount() {
  const count = favorites.length;
  document.getElementById('favCount').textContent = count;
  document.getElementById('favAppsCount').textContent = count;
}

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(favId => favId !== id);
  } else {
    favorites.push(id);
  }
  localStorage.setItem('moaz_store_favs', JSON.stringify(favorites));
  updateFavCount();
  renderApps();
}

async function shareApp(title, link) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: `جرب تطبيق ${title} من متجر معاذ ستور!`,
        url: link
      });
    } catch (err) {
      console.log('Share canceled');
    }
  } else {
    navigator.clipboard.writeText(link);
    showToast("تم نسخ رابط التطبيق للحافظة!");
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function renderApps() {
  const grid = document.getElementById('appsGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyText = document.getElementById('emptyText');
  const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
  const selectedCat = document.getElementById('categorySelect').value;

  grid.innerHTML = '';

  let filteredApps = appsData.filter(app => {
    const titleMatch = app.title ? app.title.toLowerCase().includes(searchQuery) : false;
    const descMatch = app.desc ? app.desc.toLowerCase().includes(searchQuery) : false;
    const matchesSearch = titleMatch || descMatch;
    
    const matchesTab = (currentTab === 'all') || (currentTab === 'fav' && favorites.includes(app.id));
    const matchesCat = (selectedCat === 'all') || (app.category === selectedCat);

    return matchesSearch && matchesTab && matchesCat;
  });

  if (filteredApps.length === 0) {
    emptyState.style.display = 'block';
    if (currentTab === 'fav') {
      emptyText.textContent = "لا توجد تطبيقات في المفضلة بعد!";
    } else if (appsData.length === 0) {
      emptyText.textContent = "لا توجد تطبيقات متوفرة حالياً في متجرك!";
    } else {
      emptyText.textContent = "لا توجد نتائج تطابق بحثك أو الفئة المحددة!";
    }
    return;
  } else {
    emptyState.style.display = 'none';
  }

  filteredApps.forEach(app => {
    const isFav = favorites.includes(app.id);
    const fallbackIconClass = getSmartFallbackIcon(app.category);

    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-header">
        <div class="app-icon-wrapper">
          <img src="${app.icon || ''}" alt="${app.title || ''}" class="app-icon" 
               onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
          <i class="fa-solid ${fallbackIconClass} fallback-icon" style="display: none;"></i>
        </div>
        <div class="app-info">
          <div class="app-title">${app.title || 'تطبيق بدون عنوان'}</div>
          <div class="app-desc">${app.desc || ''}</div>
          ${app.category ? `<span class="app-badge">${app.category}</span>` : ''}
        </div>
      </div>
      <div class="app-actions">
        <a href="${app.link || '#'}" target="_blank" class="btn-download">
          <i class="fa-solid fa-download"></i> تحميل
        </a>
        <button class="btn-icon btn-fav ${isFav ? 'active' : ''}" onclick="toggleFavorite(${app.id})" title="المفضلة">
          <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
        <button class="btn-icon" onclick="shareApp('${app.title || ''}', '${app.link || ''}')" title="مشاركة">
          <i class="fa-solid fa-share-nodes"></i>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}
