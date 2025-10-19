/* ========= Variables (uso var según prefieres) ========= */
var urlParams = new URLSearchParams(window.location.search);
var albumName = urlParams.get('album');

var audio = document.getElementById("audio");
var trackListEl = document.getElementById("trackList");
var albumTitle = document.getElementById("albumTitle");
var albumArtist = document.getElementById("albumArtist");
var albumCover = document.getElementById("albumCover");
var trackCount = document.getElementById("trackCount");
var playBtn = document.getElementById("playPauseBtn");
var currentCover = document.getElementById("currentCover");
var currentTitle = document.getElementById("currentTitle");
var currentArtist = document.getElementById("currentArtist");
var progressFill = document.getElementById("progressFill");
var currentTimeLabel = document.getElementById("currentTime");
var totalTimeLabel = document.getElementById("totalTime");
var searchInput = document.getElementById("searchTrack");
var searchInputMobile = document.getElementById("searchTrackMobile");
var favCountEl = document.getElementById("favCount");
var favNav = document.getElementById("favNav");
var playAllBtn = document.getElementById("playAllBtn");
var hamburger = document.getElementById("hamburger");
var mobileSidebarContainer = document.getElementById("mobileSidebarContainer");
var sidebar = document.getElementById("sidebar");
var closeSidebarBtn = document.getElementById("closeSidebarBtn");

var tracks = [];
var displayedTracks = [];
var current = null;
var isPlaying = false;
var favorites = []; // array de objetos track
var currentView = 'album'; // 'album', 'favoritos', 'search'
var previousView = null;
var allTracks = [];
var albumsTracks = {};
audio.volume = 0.8;

/* ===== utilidades ===== */
function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60).toString().padStart(2, "0");
  return m + ":" + s;
}

function saveFavorites() {
  localStorage.setItem("dp_favorites", JSON.stringify(favorites || []));
  updateFavUI();
}

function loadFavorites() {
  try {
    var f = JSON.parse(localStorage.getItem("dp_favorites") || "[]");
    favorites = Array.isArray(f) ? f : [];
  } catch (e) { 
    console.error("Error loading favorites:", e);
    favorites = []; 
  }
  updateFavUI();
}

function updateFavUI() {
  if (favCountEl) favCountEl.textContent = favorites.length;
  var mFavCount = document.getElementById("mFavCount");
  if (mFavCount) mFavCount.textContent = favorites.length;
}

/* ===== Cargar todos los álbumes ===== */
async function loadAllAlbums() {
  var albums = [
    {name: "Formula2", artistFolder: "RomeoSantos", coverFile: "Formula2.JPEG", artist: "Romeo Santos"},
    {name: "UnVeranoSinTi", artistFolder: "BadBunny", coverFile: "UnVeranoSinTi.jpeg", artist: "Bad Bunny"}
  ];

  allTracks = [];
  albumsTracks = {};

  for (let alb of albums) {
    try {
      var jsonUrl = "https://raw.githubusercontent.com/lzrdrz10/musiclive/main/" + alb.artistFolder + "/" + alb.name + ".json";
      var res = await fetch(jsonUrl);
      if (!res.ok) throw new Error("Error al cargar JSON: " + res.status);
      var data = await res.json();

      if (!Array.isArray(data) || data.length === 0) throw new Error("JSON vacío o inválido");

      var coverUrl = "https://raw.githubusercontent.com/lzrdrz10/musiclive/main/portadas/" + alb.coverFile;

      var tracks = data.map(function(t, idx) {
        return {
          id: t.id || idx + 1,
          title: t.title || ("Pista " + (idx + 1)),
          artist: t.artist || alb.artist || "Desconocido",
          url: t.url || "",
          duration: t.duration || 0,
          album: t.album || alb.name,
          cover: coverUrl
        };
      });

      albumsTracks[alb.name] = tracks;
      allTracks.push(...tracks);

    } catch (e) {
      console.error("Error cargando álbum " + alb.name + ": ", e);
    }
  }
}

/* ===== Cargar álbum (desde pre-cargados) ===== */
function loadAlbum(name) {
  if (!name || !albumsTracks[name]) {
    if (albumTitle) albumTitle.textContent = "Álbum no encontrado";
    if (albumArtist) albumArtist.textContent = "No disponible";
    if (albumCover) albumCover.src = "https://via.placeholder.com/96";
    tracks = [];
    displayedTracks = [];
    renderTracks([]);
    return;
  }

  tracks = albumsTracks[name];
  if (albumTitle) albumTitle.textContent = tracks[0].album || name;
  if (albumArtist) albumArtist.textContent = tracks[0].artist || "Desconocido";
  if (albumCover) albumCover.src = tracks[0].cover || "https://via.placeholder.com/96";
  if (trackCount) trackCount.textContent = tracks.length + " canciones";
  displayedTracks = tracks.slice();
  renderTracks(displayedTracks);

  var lastTrack = JSON.parse(localStorage.getItem("dp_lastTrack") || "null");
  var saved = lastTrack ? tracks.find(function(x){ return x.id === lastTrack.id; }) : null;
  loadTrack(saved || tracks[0]);

  localStorage.setItem("dp_lastAlbum", name);
  currentView = 'album';

  // Limpiar búsqueda al cambiar de vista
  if (searchInput) searchInput.value = "";
  if (searchInputMobile) searchInputMobile.value = "";
}

/* ===== Renderizar lista de pistas ===== */
function renderTracks(list) {
  if (!trackListEl) return;
  trackListEl.innerHTML = "";
  list.forEach(function(t) {
    var tr = document.createElement("tr");
    var activeCls = (current && current.id === t.id && current.album === t.album) ? "bg-gray-700/60" : "";
    tr.className = "cursor-pointer hover:bg-gray-700/30 transition-colors duration-150 " + activeCls;

    var isFav = favorites.some(function(f){ return f.id === t.id && f.album === t.album; });
    var star = isFav ? "★" : "☆";

    tr.innerHTML = '\
      <td class="pl-3 py-3 align-middle">' + t.id + '</td>\
      <td>\
        <div class="flex items-center gap-3">\
          <img src="' + t.cover + '" class="w-10 h-10 rounded" />\
          <div>\
            <div class="font-medium">' + escapeHtml(t.title) + '</div>\
            <div class="text-xs opacity-70">' + escapeHtml(t.artist) + '</div>\
          </div>\
        </div>\
      </td>\
      <td class="text-right pr-3 align-middle">' + formatTime(t.duration) + '</td>\
      <td class="pr-2 align-middle">\
        <button class="favBtn text-sm p-1 rounded hover:bg-white/5" data-id="' + t.id + '">' + star + '</button>\
      </td>';

    tr.onclick = function(e) {
      if (e.target.classList.contains("favBtn")) return;
      playTrack(t);
    };

    tr.ondblclick = function() {
      if (current && current.id === t.id && current.album === t.album && isPlaying) {
        audio.pause();
        if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
      } else {
        playTrack(t);
      }
    };

    tr.addEventListener("click", function(e){
      if (e.target.classList.contains("favBtn")) {
        toggleFavorite(t);
        renderTracks(displayedTracks);
      }
    });

    trackListEl.appendChild(tr);
  });
}

/* ===== Favoritos ===== */
function toggleFavorite(track) {
  var idx = favorites.findIndex(function(f){ return f.id === track.id && f.album === track.album; });
  if (idx === -1) {
    favorites.push({...track});
  } else {
    favorites.splice(idx, 1);
  }
  saveFavorites();
  if (currentView === 'favoritos') showFavorites();
}

/* ===== Mostrar favoritos ===== */
function showFavorites() {
  currentView = 'favoritos';
  if (albumTitle) albumTitle.textContent = "Favoritos";
  if (albumArtist) albumArtist.textContent = "Tus canciones guardadas";
  if (albumCover) albumCover.src = "https://via.placeholder.com/96?text=❤";
  displayedTracks = favorites.slice();
  if (trackCount) trackCount.textContent = displayedTracks.length + " canciones";
  renderTracks(displayedTracks);

  // Limpiar búsqueda al cambiar de vista
  if (searchInput) searchInput.value = "";
  if (searchInputMobile) searchInputMobile.value = "";
}

/* ===== Cargar una canción en el reproductor ===== */
function loadTrack(track) {
  if (!track) return;
  current = track;
  if (audio) audio.src = track.url || "";
  if (currentCover) {
    currentCover.style.opacity = 0;
    setTimeout(function(){
      currentCover.src = track.cover || "https://via.placeholder.com/64";
      currentCover.style.opacity = 1;
    }, 180);
  }
  if (currentTitle) currentTitle.textContent = track.title || "Sin título";
  if (currentArtist) currentArtist.textContent = track.artist || "Desconocido";
  if (totalTimeLabel) totalTimeLabel.textContent = formatTime(track.duration || 0);
  localStorage.setItem("dp_lastTrack", JSON.stringify({ id: track.id }));
  renderTracks(displayedTracks);
}

/* ===== Reproducir una pista ===== */
function playTrack(track) {
  if (!track) return;
  if (!current || current.id !== track.id || current.album !== track.album) loadTrack(track);
  audio.play().then(function(){
    isPlaying = true;
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  }).catch(function(e){
    console.error("Error playing audio:", e);
    isPlaying = true;
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  });
}

/* ===== Botones Play/Pause/Next/Prev ===== */
if (playBtn) {
  playBtn.onclick = function() {
    if (isPlaying) {
      audio.pause();
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
      isPlaying = false;
    } else {
      audio.play().then(function(){
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        isPlaying = true;
      }).catch(function(e){
        console.error("Error playing audio:", e);
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        isPlaying = true;
      });
    }
  };
}

if (document.getElementById("nextBtn")) {
  document.getElementById("nextBtn").onclick = function() {
    if (!displayedTracks.length) return;
    var idx = displayedTracks.findIndex(function(t){ return t.id === (current && current.id) && t.album === (current && current.album); });
    var next = displayedTracks[(idx + 1) % displayedTracks.length];
    playTrack(next);
  };
}

if (document.getElementById("prevBtn")) {
  document.getElementById("prevBtn").onclick = function() {
    if (!displayedTracks.length) return;
    var idx = displayedTracks.findIndex(function(t){ return t.id === (current && current.id) && t.album === (current && current.album); });
    var prev = displayedTracks[(idx - 1 + displayedTracks.length) % displayedTracks.length];
    playTrack(prev);
  };
}

/* ===== Actualizar barra de progreso ===== */
if (audio) {
  audio.ontimeupdate = function() {
    var progress = (audio.currentTime / audio.duration) * 100;
    if (progressFill) progressFill.style.width = isNaN(progress) ? "0%" : (progress + "%");
    if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audio.currentTime);
    if (totalTimeLabel) totalTimeLabel.textContent = isNaN(audio.duration) ? "0:00" : formatTime(audio.duration);
  };
}

if (progressBar) {
  progressBar.addEventListener("click", function(e){
    var rect = progressBar.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var pct = x / rect.width;
    var newTime = pct * audio.duration;
    audio.currentTime = isNaN(newTime) ? 0 : newTime;
  });
}

/* ===== Cuando termina la canción ===== */
if (audio) {
  audio.onended = function() {
    if (document.getElementById("nextBtn")) document.getElementById("nextBtn").click();
  };
}

/* ===== Buscador global ===== */
function applySearch(term) {
  term = (term || "").toLowerCase().trim();
  if (term === "") {
    previousView = null;
    if (currentView === 'search') {
      currentView = 'album';
      if (albumName) {
        loadAlbum(albumName);
      } else {
        var lastAlbum = localStorage.getItem("dp_lastAlbum");
        if (lastAlbum && albumsTracks[lastAlbum]) {
          loadAlbum(lastAlbum);
        } else {
          if (albumTitle) albumTitle.textContent = "Selecciona un álbum";
          displayedTracks = [];
          renderTracks([]);
        }
      }
    }
    return;
  }

  if (!previousView) previousView = currentView;

  displayedTracks = allTracks.filter(function(t){
    return t.title.toLowerCase().includes(term) || t.artist.toLowerCase().includes(term);
  });

  currentView = 'search';
  if (albumTitle) albumTitle.textContent = 'Resultados para "' + escapeHtml(term) + '"';
  if (albumArtist) albumArtist.textContent = "En todos los álbumes";
  if (albumCover) albumCover.src = "https://via.placeholder.com/96?text=🔍";
  if (trackCount) trackCount.textContent = displayedTracks.length + " resultados";
  renderTracks(displayedTracks);
}

if (searchInput) searchInput.oninput = function(e){ applySearch(e.target.value); };
if (searchInputMobile) searchInputMobile.oninput = function(e){ applySearch(e.target.value); };

/* ===== Play All ===== */
if (playAllBtn) {
  playAllBtn.onclick = function(){
    if (!displayedTracks.length) return;
    playTrack(displayedTracks[0]);
  };
}

/* ===== Favoritos nav click ===== */
if (favNav) {
  favNav.onclick = function() {
    showFavorites();
  };
}

/* ===== Inicio view ===== */
var inicioNavs = document.querySelectorAll('[data-view="inicio"]');
inicioNavs.forEach(function(n){ 
  n.onclick = function(){ 
    currentView = 'album';
    if (searchInput) searchInput.value = "";
    if (searchInputMobile) searchInputMobile.value = "";
    if (albumName) loadAlbum(albumName);
    else {
      var lastAlbum = localStorage.getItem("dp_lastAlbum");
      if (lastAlbum && albumsTracks[lastAlbum]) loadAlbum(lastAlbum);
      else if (albumTitle) albumTitle.textContent = "Selecciona un álbum del menú";
    }
  };
});

/* ===== Guardar último track cuando se reproduce ===== */
if (audio) {
  audio.onplay = function() {
    if (current) {
      localStorage.setItem("dp_lastTrack", JSON.stringify({ id: current.id }));
      localStorage.setItem("dp_lastAlbum", current.album || albumName || "");
    }
    saveFavorites();
  };
}

/* ===== Mobile sidebar ===== */
if (hamburger) {
  hamburger.onclick = function() {
    mobileSidebarContainer.innerHTML = '\
      <div id="mobileOverlay" class="fixed inset-0 flex z-50">\
        <div class="w-72 bg-gradient-to-b from-gray-900 to-black p-5 h-full overflow-auto">\
          <div class="flex items-center justify-between mb-4">\
            <div class="text-2xl font-black">DarkPlayer</div>\
            <button id="mobileClose" class="p-2 rounded hover:bg-white/5">✕</button>\
          </div>\
          <nav>\
            <ul class="space-y-3 text-sm">\
              <li class="flex items-center gap-3 hover:text-white cursor-pointer" id="mInicio">🏠 Inicio</li>\
              <li><a href="?album=Formula2" class="hover:text-white">🎵 Romeo Santos - Fórmula Vol.2</a></li>\
              <li><a href="?album=UnVeranoSinTi" class="hover:text-white">🌴 Bad Bunny - Un Verano Sin Ti</a></li>\
              <li class="pt-4 border-t border-gray-800 text-xs opacity-80">Listas</li>\
              <li class="flex items-center gap-3 hover:text-white cursor-pointer" id="mFav">⭐ Favoritos <span id="mFavCount" class="ml-2 text-xs opacity-70">' + favorites.length + '</span></li>\
            </ul>\
          </nav>\
        </div>\
        <div id="mobileOverlayBg" class="flex-1 overlay"></div>\
      </div>';

    document.getElementById("mobileClose").onclick = function(){ mobileSidebarContainer.innerHTML = ""; };
    document.getElementById("mobileOverlayBg").onclick = function(){ mobileSidebarContainer.innerHTML = ""; };

    document.getElementById("mInicio").onclick = function(){
      mobileSidebarContainer.innerHTML = "";
      currentView = 'album';
      if (albumName) loadAlbum(albumName);
    };
    document.getElementById("mFav").onclick = function(){
      mobileSidebarContainer.innerHTML = "";
      showFavorites();
    };
  };
}

/* ===== Small UX: close sidebar button in mobile ===== */
if (closeSidebarBtn) {
  closeSidebarBtn.onclick = function(){ 
    if (sidebar) sidebar.classList.add("hidden"); 
  };
}

/* ===== Escape key cerrar mobile overlay ===== */
document.addEventListener("keydown", function(e){
  if (e.key === "Escape" && mobileSidebarContainer) {
    mobileSidebarContainer.innerHTML = "";
  }
});

/* ===== Escape HTML helper ===== */
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ===== Inicialización ===== */
(async function init(){
  loadFavorites();
  await loadAllAlbums();

  var lastAlbum = localStorage.getItem("dp_lastAlbum");
  if (albumName) {
    loadAlbum(albumName);
  } else if (lastAlbum && albumsTracks[lastAlbum]) {
    loadAlbum(lastAlbum);
  } else {
    if (albumTitle) albumTitle.textContent = "Selecciona un álbum del menú";
  }
})();
