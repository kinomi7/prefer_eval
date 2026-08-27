const STORAGE_VERSION = 'v3';
const VAS_KEYS = ['like', 'fit', 'wearDaily', 'wearPure'];
const DEFAULT_VAS_VALUE = 50;

let IMAGES = [];
let PACKAGE_CONFIG = {};
let ratings = {};
let currentIndex = 0;
let saveTimer = null;
let listenersBound = false;
let dragging = null;

const outfitImg = document.getElementById('outfit-image');
const imgLoading = document.getElementById('image-loading');
const imageNameEl = document.getElementById('image-name');
const imageIndexEl = document.getElementById('image-index');
const ratedCountEl = document.getElementById('rated-count');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const siteBadgeEl = document.getElementById('site-badge');
const evalHintEl = document.getElementById('eval-hint');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnExport = document.getElementById('btn-export');
const btnReset = document.getElementById('btn-reset');
const appLoadingEl = document.getElementById('app-loading');
const appErrorEl = document.getElementById('app-error');
const appErrorMessageEl = document.getElementById('app-error-message');
const appContainerEl = document.getElementById('app-container');
const vasEls = Object.fromEntries(
    VAS_KEYS.map(key => [key, document.querySelector(`.vas[data-key="${key}"]`)])
);

function getSiteId() {
    return PACKAGE_CONFIG.siteId || 'default';
}

function storageKey(suffix) {
    return `prefer_eval_${STORAGE_VERSION}_${getSiteId()}_${suffix}`;
}

function emptyRating() {
    return {
        like: null,
        fit: null,
        wearDaily: null,
        wearPure: null,
        confirmed: false,
    };
}

function displayValue(value) {
    return value === null ? DEFAULT_VAS_VALUE : value;
}

function currentFileName() {
    return IMAGES[currentIndex].fileName;
}

function getRating(fileName) {
    if (!ratings[fileName]) ratings[fileName] = emptyRating();
    return ratings[fileName];
}

function isComplete(rating) {
    return rating.confirmed === true;
}

function showLoadError(message) {
    appLoadingEl.hidden = true;
    appErrorMessageEl.textContent = message;
    appErrorEl.hidden = false;
}

function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveProgress, 80);
}

function saveProgress() {
    localStorage.setItem(storageKey('ratings'), JSON.stringify(ratings));
    localStorage.setItem(storageKey('current_index'), String(currentIndex));
}

function loadProgress() {
    ratings = {};
    IMAGES.forEach(img => { ratings[img.fileName] = emptyRating(); });

    try {
        const saved = JSON.parse(localStorage.getItem(storageKey('ratings')) || '{}');
        Object.keys(saved).forEach(fileName => {
            if (!ratings[fileName]) return;
            const item = saved[fileName] || {};
            ratings[fileName] = {
                like: numberOrNull(item.like),
                fit: numberOrNull(item.fit),
                wearDaily: numberOrNull(item.wearDaily ?? item.wear),
                wearPure: numberOrNull(item.wearPure),
                confirmed: item.confirmed === true,
            };
        });
    } catch (_) {
        // keep empty ratings
    }

    const rawIndex = localStorage.getItem(storageKey('current_index'));
    const savedIndex = rawIndex === null ? null : Number.parseInt(rawIndex, 10);
    if (savedIndex !== null && savedIndex >= 0 && savedIndex < IMAGES.length) {
        currentIndex = savedIndex;
    } else {
        const firstOpen = IMAGES.findIndex(img => !isComplete(ratings[img.fileName]));
        currentIndex = firstOpen !== -1 ? firstOpen : 0;
    }
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Math.max(0, Math.min(100, num));
}

function setVasValue(key, value) {
    const el = vasEls[key];
    if (!el) return;
    const thumb = el.querySelector('.vas-thumb');
    const track = el.querySelector('.vas-track');
    const shown = displayValue(value);
    thumb.hidden = false;
    thumb.style.left = `${shown}%`;
    track.setAttribute('aria-valuenow', String(Math.round(shown)));
}

function valueFromPointer(track, clientX) {
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, ratio * 100));
}

function applyVasFromEvent(key, clientX) {
    const track = vasEls[key].querySelector('.vas-track');
    const value = valueFromPointer(track, clientX);
    getRating(currentFileName())[key] = value;
    setVasValue(key, value);
    updateStatistics();
    scheduleSave();
}

function render() {
    if (IMAGES.length === 0) return;
    const image = IMAGES[currentIndex];
    const rating = getRating(image.fileName);

    imgLoading.style.display = 'block';
    outfitImg.classList.add('loading');
    outfitImg.src = image.path;
    outfitImg.alt = image.fileName;
    outfitImg.onload = () => {
        imgLoading.style.display = 'none';
        outfitImg.classList.remove('loading');
    };
    outfitImg.onerror = () => {
        imgLoading.style.display = 'none';
        outfitImg.classList.remove('loading');
        outfitImg.alt = '画像の読み込みに失敗しました';
    };

    imageNameEl.textContent = image.fileName;
    imageIndexEl.textContent = `${currentIndex + 1} / ${IMAGES.length}`;
    document.title = `服装選好評価 — ${PACKAGE_CONFIG.label || getSiteId()}`;

    VAS_KEYS.forEach(key => setVasValue(key, rating[key]));

    btnPrev.disabled = currentIndex === 0;
    btnNext.textContent = currentIndex === IMAGES.length - 1 ? '完了を確認' : '次の画像 →';
    evalHintEl.hidden = true;
    updateStatistics();
}

function updateStatistics() {
    const total = IMAGES.length;
    const completeCount = IMAGES.filter(img => isComplete(ratings[img.fileName])).length;
    const percent = total ? (completeCount / total) * 100 : 0;
    ratedCountEl.textContent = `${completeCount} / ${total}`;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${completeCount} / ${total} (${percent.toFixed(0)}%)`;
}

function finalizeCurrentRating() {
    const rating = getRating(currentFileName());
    VAS_KEYS.forEach(key => {
        if (rating[key] === null) rating[key] = DEFAULT_VAS_VALUE;
    });
    rating.confirmed = true;
}

function setupEventListeners() {
    if (listenersBound) return;
    listenersBound = true;

    VAS_KEYS.forEach(key => {
        const track = vasEls[key].querySelector('.vas-track');
        track.addEventListener('pointerdown', event => {
            event.preventDefault();
            dragging = key;
            track.setPointerCapture(event.pointerId);
            applyVasFromEvent(key, event.clientX);
        });
        track.addEventListener('pointermove', event => {
            if (dragging !== key) return;
            applyVasFromEvent(key, event.clientX);
        });
        track.addEventListener('pointerup', () => { dragging = null; });
        track.addEventListener('pointercancel', () => { dragging = null; });
        track.addEventListener('keydown', event => {
            const rating = getRating(currentFileName());
            const current = displayValue(rating[key]);
            let next = current;
            if (event.key === 'ArrowLeft') next = current - 2;
            else if (event.key === 'ArrowRight') next = current + 2;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = 100;
            else return;
            event.preventDefault();
            rating[key] = Math.max(0, Math.min(100, next));
            setVasValue(key, rating[key]);
            updateStatistics();
            scheduleSave();
        });
    });

    btnPrev.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex -= 1;
            render();
        }
    });

    btnNext.addEventListener('click', () => {
        finalizeCurrentRating();
        scheduleSave();
        updateStatistics();
        if (currentIndex < IMAGES.length - 1) {
            currentIndex += 1;
            render();
            return;
        }
        alert('すべての必須項目が入力されています。CSVエクスポートで結果を保存できます。');
    });

    btnReset.addEventListener('click', () => {
        if (!confirm('すべての評価データをリセットしますか？この操作は取り消せません。')) return;
        IMAGES.forEach(img => { ratings[img.fileName] = emptyRating(); });
        currentIndex = 0;
        localStorage.removeItem(storageKey('ratings'));
        localStorage.removeItem(storageKey('current_index'));
        render();
    });

    btnExport.addEventListener('click', exportToCSV);
}

function exportToCSV() {
    let csv = '\ufeff';
    csv += `Site,${getSiteId()}\n`;
    csv += `Label,${PACKAGE_CONFIG.label || ''}\n`;
    csv += 'Filename,Like (0-100),Fit (0-100),WearDaily (0-100),WearPure (0-100),Complete\n';

    IMAGES.forEach(img => {
        const rating = getRating(img.fileName);
        const like = rating.confirmed && rating.like !== null ? rating.like.toFixed(1) : '';
        const fit = rating.confirmed && rating.fit !== null ? rating.fit.toFixed(1) : '';
        const wearDaily = rating.confirmed && rating.wearDaily !== null ? rating.wearDaily.toFixed(1) : '';
        const wearPure = rating.confirmed && rating.wearPure !== null ? rating.wearPure.toFixed(1) : '';
        csv += `"${img.fileName}",${like},${fit},${wearDaily},${wearPure},${isComplete(rating) ? 'Yes' : 'No'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prefer_eval_${getSiteId()}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function initApp() {
    try {
        const [configRes, imagesRes] = await Promise.all([
            fetch('./config.json'),
            fetch('./images.json'),
        ]);
        if (!configRes.ok || !imagesRes.ok) {
            throw new Error('サイトのデータを取得できませんでした');
        }

        PACKAGE_CONFIG = await configRes.json();
        const payload = await imagesRes.json();
        IMAGES = payload.images || [];
        if (IMAGES.length === 0) {
            throw new Error('評価する画像が見つかりません');
        }

        siteBadgeEl.textContent = PACKAGE_CONFIG.label || PACKAGE_CONFIG.siteId;
        loadProgress();
        setupEventListeners();
        appLoadingEl.hidden = true;
        appContainerEl.hidden = false;
        render();
    } catch (err) {
        showLoadError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', initApp);
