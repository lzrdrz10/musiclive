var urlParams = new URLSearchParams(window.location.search);
var albumName = urlParams.get('album');

var audio = document.getElementById("audio");
var welcomeSection = document.getElementById("welcomeSection");
var albumSection = document.getElementById("albumSection");
var trackListEl = document.getElementById("trackList");
var albumTrackListEl = document.getElementById("albumTrackList");
var albumTitle = document.getElementById("albumTitle");
var albumArtist = document.getElementById("albumArtist");
var albumCover = document.getElementById("albumCover");
var albumTrackCount = document.getElementById("albumTrackCount");
var playBtn = document.getElementById("playPauseBtn");
var currentCover = document.getElementById("currentCover");
var currentTitle = document.getElementById("currentTitle");
var currentArtist = document.getElementById("currentArtist");
var progressBar = document.getElementById("progressBar");
var progressFill = document.getElementById("progressFill");
var currentTimeLabel = document.getElementById("currentTime");
var totalTimeLabel = document.getElementById("totalTime");
var searchInput = document.getElementById("searchTrack");
var searchInputMobile = document.getElementById("searchTrackMobile");
var searchInputAlbum = document.getElementById("searchTrackAlbum");
var searchInputMobileAlbum = document.getElementById("searchTrackMobileAlbum");
var favCountEl = document.getElementById("favCount");
var favNav = document.getElementById("favNav");
var hamburger = document.getElementById("hamburger");
var mobileSidebarContainer = document.getElementById("mobileSidebarContainer");
var sidebar = document.getElementById("sidebar");
var closeSidebarBtn = document.getElementById("closeSidebarBtn");
var shuffleBtn = document.getElementById("shuffleBtn");
var sidebarNav = document.getElementById("sidebarNav");
var footerFavBtn = document.getElementById("footerFavBtn");

var tracks = [];
var displayedTracks = [];
var current = null;
var isPlaying = false;
var isShuffling = false;
var favorites = [];
var currentView = 'welcome';
var previousView = null;
var allTracks = [];
var albumsTracks = {};
var artists = {};
audio.volume = 0.8;

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
  if (footerFavBtn && current) {
    var isFav = favorites.some(function(f){ return f.id === current.id && f.album === current.album; });
    footerFavBtn.textContent = isFav ? "★" : "☆";
    footerFavBtn.classList.toggle("active", isFav);
  }
}

function loadShuffleState() {
  try {
    isShuffling = JSON.parse(localStorage.getItem("dp_shuffle") || "false");
    updateShuffleUI();
  } catch (e) {
    console.error("Error loading shuffle state:", e);
    isShuffling = false;
  }
}

function saveShuffleState() {
  localStorage.setItem("dp_shuffle", JSON.stringify(isShuffling));
  updateShuffleUI();
}

function updateShuffleUI() {
  if (shuffleBtn) {
    if (isShuffling) {
      shuffleBtn.classList.add("active");
    } else {
      shuffleBtn.classList.remove("active");
    }
  }
}

function getRandomTrack() {
  if (!displayedTracks.length) return null;
  var idx = Math.floor(Math.random() * displayedTracks.length);
  return displayedTracks[idx];
}

async function loadAllAlbums() {
  var albums = [
    {name: "Formula1", artistFolder: "RomeoSantos", coverFile: "formula1original.jpg", artist: "Romeo Santos"},
    {name: "Formula2", artistFolder: "RomeoSantos", coverFile: "Formula2.JPEG", artist: "Romeo Santos"},
    {name: "UnVeranoSinTi", artistFolder: "BadBunny", coverFile: "UnVeranoSinTi.jpeg", artist: "Bad Bunny"},
    {name: "TuUltimaCancion", artistFolder: "Temerarios", coverFile: "TuUltimaCancion.jpeg", artist: "Los Temerarios"},
    {name: "Formula3", artistFolder: "RomeoSantos", coverFile: "Formula1.jpg", artist: "Romeo Santos"},
    {name: "CrystalCastles", artistFolder: "CrystalCastles", coverFile: "CrystalCastles.jpg", artist: "Crystal Castles"}
  ];

  allTracks = [];
  albumsTracks = {};
  artists = {};

  for (let alb of albums) {
    try {
      var jsonUrl = `https://raw.githubusercontent.com/lzrdrz10/musiclive/main/${alb.artistFolder}/${alb.name}.json`;
      console.log("Intentando cargar JSON:", jsonUrl);
      var res = await fetch(jsonUrl);
      if (!res.ok) throw new Error(`Error al cargar JSON para ${alb.name}: ${res.status}`);
      var data = await res.json();

      if (!Array.isArray(data) || data.length === 0) throw new Error(`JSON vacío o inválido para ${alb.name}`);

      var coverUrl = `https://raw.githubusercontent.com/lzrdrz10/musiclive/main/portadas/${alb.coverFile}`;
      var coverRes = await fetch(coverUrl);
      if (!coverRes.ok) {
        console.warn(`Portada no encontrada para ${alb.name}: ${coverUrl}, usando placeholder`);
        coverUrl = "https://via.placeholder.com/96";
      }

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

      if (!artists[alb.artist]) {
        artists[alb.artist] = [];
      }
      artists[alb.artist].push(alb);

    } catch (e) {
      console.error(`Error cargando álbum ${alb.name}:`, e);
    }
  }

  console.log("Álbumes cargados:", Object.keys(albumsTracks));
  console.log("Artistas encontrados:", Object.keys(artists));

  renderSidebar();
}

function renderSidebar() {
  if (!sidebarNav) return;
  var navHtml = '\
    <li class="flex items-center gap-3 hover:text-white cursor-pointer" data-view="welcome">🏠 Inicio</li>';
  
  var artistNames = Object.keys(artists).sort();
  for (var artist of artistNames) {
    if (artists.hasOwnProperty(artist)) {
      navHtml += '\
        <li><details class="hover:text-white">\
          <summary class="flex items-center gap-3 text-sm">' + escapeHtml(artist) + '</summary>\
          <ul class="text-sm">';
      artists[artist].forEach(function(alb) {
        var icon = alb.name === "Formula1" ? "💿" :
                   alb.name === "Formula2" ? "💿" :
                   alb.name === "UnVeranoSinTi" ? "💿" :
                   alb.name === "TuUltimaCancion" ? "💿" :
                   alb.name === "CrystalCastles" ? "💿" :
                   alb.name === "Formula3" ? "💿" : "💿";
        navHtml += '<li><a href="?album=' + alb.name + '" class="hover:text-white">' + icon + ' ' + escapeHtml(alb.name) + '</a></li>';
      });
      navHtml += '</ul></details></li>';
    }
  }

  navHtml += '\
    <li class="pt-4 border-t border-gray-800 text-xs opacity-80">Listas</li>\
    <li class="flex items-center gap-3 hover:text-white cursor-pointer" id="favNav">\
      ⭐ Favoritos <span id="favCount" class="ml-2 text-xs opacity-70">0</span>\
    </li>';

  sidebarNav.innerHTML = navHtml;

  var newFavNav = document.getElementById("favNav");
  if (newFavNav) {
    newFavNav.onclick = function() {
      showFavorites();
    };
  }

  var inicioNavs = document.querySelectorAll('[data-view="welcome"]');
  inicioNavs.forEach(function(n){ 
    n.onclick = function(){ 
      showWelcome();
    };
  });
}

function showWelcome() {
  currentView = 'welcome';
  if (welcomeSection) welcomeSection.classList.remove("hidden");
  if (albumSection) albumSection.classList.add("hidden");
  displayedTracks = allTracks.slice();
  renderTracks(displayedTracks, trackListEl);

  if (searchInput) searchInput.value = "";
  if (searchInputMobile) searchInputMobile.value = "";
  if (searchInputAlbum) searchInputAlbum.value = "";
  if (searchInputMobileAlbum) searchInputMobileAlbum.value = "";
}

function loadAlbum(name) {
  if (!name || !albumsTracks[name]) {
    if (albumTitle) albumTitle.textContent = "Álbum no encontrado";
    if (albumArtist) albumArtist.textContent = "No disponible";
    if (albumCover) albumCover.src = "https://via.placeholder.com/96";
    tracks = [];
    displayedTracks = [];
    renderTracks([], albumTrackListEl);
    return;
  }

  if (welcomeSection) welcomeSection.classList.add("hidden");
  if (albumSection) albumSection.classList.remove("hidden");
  tracks = albumsTracks[name];
  if (albumTitle) albumTitle.textContent = tracks[0].album || name;
  if (albumArtist) albumArtist.textContent = tracks[0].artist || "Desconocido";
  if (albumCover) albumCover.src = tracks[0].cover || "https://via.placeholder.com/96";
  if (albumTrackCount) albumTrackCount.textContent = tracks.length + " canciones";
  displayedTracks = tracks.slice();
  renderTracks(displayedTracks, albumTrackListEl);

  var lastTrack = JSON.parse(localStorage.getItem("dp_lastTrack") || "null");
  var saved = lastTrack ? tracks.find(function(x){ return x.id === lastTrack.id; }) : null;
  loadTrack(saved || tracks[0]);

  localStorage.setItem("dp_lastAlbum", name);
  currentView = 'album';

  if (searchInput) searchInput.value = "";
  if (searchInputMobile) searchInputMobile.value = "";
  if (searchInputAlbum) searchInputAlbum.value = "";
  if (searchInputMobileAlbum) searchInputMobileAlbum.value = "";
}

function renderTracks(list, targetEl) {
  if (!targetEl) return;
  targetEl.innerHTML = "";
  list.forEach(function(t) {
    var tr = document.createElement("tr");
    var activeCls = (current && current.id === t.id && current.album === t.album) ? "active-track" : "";
    tr.className = "cursor-pointer hover:bg-gray-700/30 transition-colors duration-150 " + activeCls;

    tr.innerHTML = '\
      <td class="pl-4 py-3 align-middle">' + t.id + '</td>\
      <td>\
        <div class="track-info">\
          <img src="' + t.cover + '" class="track-cover" onerror="this.src=\'https://via.placeholder.com/96\'" />\
          <div class="track-details">\
            <div class="track-title" title="' + escapeHtml(t.title) + '">' + escapeHtml(t.title) + '</div>\
            <div class="track-artist">' + escapeHtml(t.artist) + '</div>\
          </div>\
        </div>\
      </td>\
      <td class="text-right pr-4 align-middle">' + formatTime(t.duration) + '</td>';

    tr.onclick = function(e) {
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

    targetEl.appendChild(tr);
  });
}

function toggleFavorite(track) {
  console.log("Toggling favorite for track:", track);
  console.log("Current favorites:", favorites);
  var idx = favorites.findIndex(function(f){ return f.id === track.id && f.album === track.album; });
  if (idx === -1) {
    favorites.push({...track});
    console.log("Added to favorites:", track);
  } else {
    favorites.splice(idx, 1);
    console.log("Removed from favorites:", track);
  }
  saveFavorites();
  if (currentView === 'favoritos') showFavorites();
  else if (currentView === 'welcome') showWelcome();
  else if (currentView === 'album') loadAlbum(albumName);
}

function showFavorites() {
  currentView = 'favoritos';
  if (welcomeSection) welcomeSection.classList.remove("hidden");
  if (albumSection) albumSection.classList.add("hidden");
  displayedTracks = favorites.slice();
  renderTracks(displayedTracks, trackListEl);

  if (searchInput) searchInput.value = "";
  if (searchInputMobile) searchInputMobile.value = "";
  if (searchInputAlbum) searchInputAlbum.value = "";
  if (searchInputMobileAlbum) searchInputMobileAlbum.value = "";
}

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
  if (currentView === 'welcome' || currentView === 'favoritos' || currentView === 'search') {
    renderTracks(displayedTracks, trackListEl);
  } else if (currentView === 'album') {
    renderTracks(displayedTracks, albumTrackListEl);
  }
  updateFavUI();
}

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
    if (isShuffling) {
      var next = getRandomTrack();
      while (next && current && next.id === current.id && next.album === current.album && displayedTracks.length > 1) {
        next = getRandomTrack();
      }
      playTrack(next);
    } else {
      var idx = displayedTracks.findIndex(function(t){ return t.id === (current && current.id) && t.album === (current && current.album); });
      var next = displayedTracks[(idx + 1) % displayedTracks.length];
      playTrack(next);
    }
  };
}

if (document.getElementById("prevBtn")) {
  document.getElementById("prevBtn").onclick = function() {
    if (!displayedTracks.length) return;
    if (isShuffling) {
      var prev = getRandomTrack();
      while (prev && current && prev.id === current.id && prev.album === current.album && displayedTracks.length > 1) {
        prev = getRandomTrack();
      }
      playTrack(prev);
    } else {
      var idx = displayedTracks.findIndex(function(t){ return t.id === (current && current.id) && t.album === (current && current.album); });
      var prev = displayedTracks[(idx - 1 + displayedTracks.length) % displayedTracks.length];
      playTrack(prev);
    }
  };
}

if (shuffleBtn) {
  shuffleBtn.onclick = function() {
    isShuffling = !isShuffling;
    saveShuffleState();
  };
}

if (footerFavBtn) {
  footerFavBtn.onclick = function() {
    console.log("Favorites button clicked, current track:", current);
    if (current) {
      toggleFavorite(current);
      updateFavUI();
      if (currentView === 'welcome' || currentView === 'favoritos' || currentView === 'search') {
        renderTracks(displayedTracks, trackListEl);
      } else if (currentView === 'album') {
        renderTracks(displayedTracks, albumTrackListEl);
      }
    } else {
      console.warn("No current track selected");
    }
  };
}

if (audio) {
  audio.ontimeupdate = function() {
    var progress = (audio.currentTime / audio.duration) * 100;
    if (progressFill) progressFill.style.width = isNaN(progress) ? "0%" : (progress + "%");
    if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audio.currentTime);
    if (totalTimeLabel) totalTimeLabel.textContent = isNaN(audio.duration) ? "0:00" : formatTime(audio.duration);
  };
}

if (progressBar) {
  function setProgress(e) {
    var rect = progressBar.getBoundingClientRect();
    var x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    var width = rect.width;
    var percentage = Math.max(0, Math.min(1, x / width));
    if (!isNaN(audio.duration)) {
      audio.currentTime = percentage * audio.duration;
    }
  }

  progressBar.addEventListener("click", setProgress);

  var isDragging = false;
  progressBar.addEventListener("mousedown", function(e) {
    isDragging = true;
    setProgress(e);
  });
  document.addEventListener("mousemove", function(e) {
    if (isDragging) setProgress(e);
  });
  document.addEventListener("mouseup", function() {
    isDragging = false;
  });

  progressBar.addEventListener("touchstart", function(e) {
    e.preventDefault();
    setProgress(e);
  });
  progressBar.addEventListener("touchmove", function(e) {
    e.preventDefault();
    setProgress(e);
  });
  progressBar.addEventListener("touchend", function() {});
}

if (audio) {
  audio.onended = function() {
    if (document.getElementById("nextBtn")) document.getElementById("nextBtn").click();
  };
}

function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function applySearch(term) {
  if (!term || term.trim() === "") {
    if (currentView === 'search') {
      if (albumName) {
        loadAlbum(albumName);
      } else {
        showWelcome();
      }
    }
    return;
  }

  if (!previousView) previousView = currentView;

  var terms = normalizeText(term).split(/\s+/).filter(t => t.length > 0);

  displayedTracks = allTracks.filter(function(t) {
    var title = normalizeText(t.title || "");
    var artist = normalizeText(t.artist || "");
    return terms.every(function(word) {
      return title.includes(word) || artist.includes(word);
    });
  });

  currentView = 'search';
  if (welcomeSection) welcomeSection.classList.remove("hidden");
  if (albumSection) albumSection.classList.add("hidden");
  renderTracks(displayedTracks, trackListEl);
}

function setupSearchInput(input) {
  if (!input) return;

  input.addEventListener('keydown', function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch(e.target.value);
      input.blur();
    }
  });

  input.addEventListener('compositionend', function(e) {});
}

setupSearchInput(searchInput);
setupSearchInput(searchInputMobile);
setupSearchInput(searchInputAlbum);
setupSearchInput(searchInputMobileAlbum);

if (favNav) {
  favNav.onclick = function() {
    showFavorites();
  };
}

var inicioNavs = document.querySelectorAll('[data-view="welcome"]');
inicioNavs.forEach(function(n){ 
  n.onclick = function(){ 
    showWelcome();
  };
});

if (audio) {
  audio.onplay = function() {
    if (current) {
      localStorage.setItem("dp_lastTrack", JSON.stringify({ id: current.id }));
      localStorage.setItem("dp_lastAlbum", current.album || albumName || "");
    }
    saveFavorites();
  };
}

if (hamburger) {
  hamburger.onclick = function() {
    var navHtml = '\
      <div id="mobileOverlay" class="fixed inset-0 flex z-50">\
        <div class="w-72 bg-gradient-to-b from-gray-900 to-black p-5 h-full overflow-auto">\
          <div class="flex items-center justify-between mb-4">\
            <div class="text-2xl font-black">DarkPlayer</div>\
            <button id="mobileClose" class="p-2 rounded hover:bg-white/5">✕</button>\
          </div>\
          <nav>\
            <ul class="space-y-3 text-sm">\
              <li class="flex items-center gap-3 hover:text-white cursor-pointer" id="mInicio">🏠 Inicio</li>';

    var artistNames = Object.keys(artists).sort();
    for (var artist of artistNames) {
      if (artists.hasOwnProperty(artist)) {
        navHtml += '\
          <li><details class="hover:text-white">\
            <summary class="flex items-center gap-3 text-sm">' + escapeHtml(artist) + '</summary>\
            <ul class="text-sm">';
        artists[artist].forEach(function(alb) {
          var icon = alb.name === "Formula1" ? "💿" :
                   alb.name === "Formula2" ? "💿" :
                   alb.name === "UnVeranoSinTi" ? "💿" :
                   alb.name === "TuUltimaCancion" ? "💿" :
                   alb.name === "CrystalCastles" ? "💿" :
                   alb.name === "Formula3" ? "💿" : "💿";
          navHtml += '<li><a href="?album=' + alb.name + '" class="hover:text-white">' + icon + ' ' + escapeHtml(alb.name) + '</a></li>';
        });
        navHtml += '</ul></details></li>';
      }
    }

    navHtml += '\
              <li class="pt-4 border-t border-gray-800 text-xs opacity-80">Listas</li>\
              <li class="flex items-center gap-3 hover:text-white cursor-pointer" id="mFav">⭐ Favoritos <span id="mFavCount" class="ml-2 text-xs opacity-70">' + favorites.length + '</span></li>\
            </ul>\
          </nav>\
        </div>\
        <div id="mobileOverlayBg" class="flex-1 overlay"></div>\
      </div>';

    mobileSidebarContainer.innerHTML = navHtml;

    document.getElementById("mobileClose").onclick = function(){ mobileSidebarContainer.innerHTML = ""; };
    document.getElementById("mobileOverlayBg").onclick = function(){ mobileSidebarContainer.innerHTML = ""; };

    document.getElementById("mInicio").onclick = function(){
      mobileSidebarContainer.innerHTML = "";
      showWelcome();
    };
    document.getElementById("mFav").onclick = function(){
      mobileSidebarContainer.innerHTML = "";
      showFavorites();
    };
  };
}

if (closeSidebarBtn) {
  closeSidebarBtn.onclick = function(){ 
    if (sidebar) sidebar.classList.add("hidden"); 
  };
}

document.addEventListener("keydown", function(e){
  if (e.key === "Escape" && mobileSidebarContainer) {
    mobileSidebarContainer.innerHTML = "";
  }
});

function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

(async function init(){
  loadFavorites();
  loadShuffleState();
  await loadAllAlbums();

  var lastAlbum = localStorage.getItem("dp_lastAlbum");
  if (albumName) {
    loadAlbum(albumName);
  } else {
    showWelcome();
    if (allTracks.length > 0 && !current) {
      loadTrack(allTracks[0]);
    }
  }
})();
