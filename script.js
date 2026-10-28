const preferenceKey = "ecos-del-mas-alla-audio";
const pendingSongKey = "ecos-del-mas-alla-audio-return";
const authorizationAttemptKey = "ecos-del-mas-alla-audio-authorization-attempt";
const coverLink = document.querySelector(".cover-cta[href]");

const getPendingSongUrl = () => {
  const pendingUrl = sessionStorage.getItem(pendingSongKey);
  if (!pendingUrl) {
    return null;
  }

  const destination = new URL(pendingUrl, window.location.href);
  const coverPath = new URL("index.html", window.location.href).pathname;
  if (
    destination.origin !== window.location.origin ||
    !destination.pathname.endsWith(".html") ||
    destination.pathname === coverPath
  ) {
    sessionStorage.removeItem(pendingSongKey);
    return null;
  }

  return destination.href;
};

const redirectCoverToPendingSong = (coverLink) => {
  const launchCurtain = document.querySelector("[data-launch-curtain]");
  if (launchCurtain && !launchCurtain.hidden) {
    return false;
  }

  const destination = getPendingSongUrl();
  sessionStorage.removeItem(pendingSongKey);
  if (!destination) {
    return false;
  }

  coverLink.href = destination;
  coverLink.innerHTML = 'Volver al recorrido <span aria-hidden="true">→</span>';
  return true;
};

if (coverLink) {
  const audio = document.querySelector(".cover-audio");
  const status = document.querySelector("[data-cover-audio-status]");
  const launchCurtain = document.querySelector("[data-launch-curtain]");
  const authorizationRequested =
    new URLSearchParams(window.location.search).get("audio") === "authorize";
  const gate = document.createElement("dialog");
  gate.className = "audio-gate";
  gate.setAttribute("aria-labelledby", "audio-gate-title");
  gate.setAttribute("aria-describedby", "audio-gate-description");
  gate.innerHTML = `
    <div class="audio-gate-content">
      <p class="eyebrow">Una ofrenda sonora</p>
      <h2 id="audio-gate-title">¿Quieres escuchar el recorrido?</h2>
      <p id="audio-gate-description" class="audio-gate-description">
        Activa la música para escuchar el tema de la portada mientras esperas y las canciones del recorrido.
        Esta elección se guardará y no volveremos a mostrar este aviso.
      </p>
      <p class="audio-gate-status" data-gate-audio-status aria-live="polite"></p>
      <div class="audio-gate-actions">
        <button class="button button-primary" type="button" data-enable-audio>Activar música de fondo</button>
        <button class="button button-secondary" type="button" data-skip-audio>Continuar sin música</button>
      </div>
    </div>`;
  document.body.append(gate);

  const enableAudio = gate.querySelector("[data-enable-audio]");
  const skipAudio = gate.querySelector("[data-skip-audio]");
  const gateStatus = gate.querySelector("[data-gate-audio-status]");
  let retryListenersAttached = false;
  let coverHasPlayed = false;

  const removeRetryListeners = () => {
    if (retryListenersAttached) {
      document.removeEventListener("pointerdown", retryBackgroundAudio);
      document.removeEventListener("keydown", retryBackgroundAudio);
      retryListenersAttached = false;
    }
  };

  const showAuthorizationGate = (
    message = "El navegador bloqueó la reproducción automática. Autoriza la música desde esta portada para continuar."
  ) => {
    removeRetryListeners();
    gateStatus.textContent = message;
    gateStatus.hidden = false;
    if (!gate.open) {
      gate.showModal();
    }
  };

  const retryBackgroundAudio = async () => {
    if (audio.paused) {
      try {
        await audio.play();
        coverHasPlayed = true;
        status.hidden = true;
        removeRetryListeners();
      } catch {
        showAuthorizationGate();
      }
    }
  };

  const startBackgroundAudio = async () => {
    try {
      await audio.play();
      coverHasPlayed = true;
      localStorage.setItem(preferenceKey, "enabled");
      gate.close();
      if (redirectCoverToPendingSong(coverLink)) {
        status.textContent = "La música está activa. Continúa el recorrido cuando quieras.";
        status.hidden = false;
      } else {
        status.hidden = true;
      }
    } catch {
      gateStatus.textContent =
        "No se pudo iniciar index.mp3. Comprueba el archivo y los permisos de sonido del sitio.";
      gateStatus.hidden = false;
    }
  };

  enableAudio.addEventListener("click", startBackgroundAudio);

  audio.addEventListener("play", () => {
    coverHasPlayed = true;
  });

  audio.addEventListener("pause", () => {
    if (
      coverHasPlayed &&
      localStorage.getItem(preferenceKey) === "enabled" &&
      document.visibilityState === "visible"
    ) {
      showAuthorizationGate("La música de fondo dejó de sonar. Pulsa «Activar música de fondo» para reanudarla.");
    }
  });

  audio.addEventListener("error", () => {
    const message = "No se pudo cargar index.mp3. Comprueba que esté junto a index.html.";
    if (gate.open) {
      gateStatus.textContent = message;
      gateStatus.hidden = false;
    } else {
      status.textContent = message;
      status.hidden = false;
    }
  });

  skipAudio.addEventListener("click", () => {
    localStorage.setItem(preferenceKey, "muted");
    audio.pause();
    gate.close();
    sessionStorage.removeItem(authorizationAttemptKey);
    redirectCoverToPendingSong(coverLink);
  });

  gate.addEventListener("cancel", (event) => {
    event.preventDefault();
  });

  const startCoverExperience = () => {
    const preference = localStorage.getItem(preferenceKey);
    if (authorizationRequested) {
      showAuthorizationGate();
    } else if (preference === "enabled") {
      retryBackgroundAudio();
      document.addEventListener("pointerdown", retryBackgroundAudio);
      document.addEventListener("keydown", retryBackgroundAudio);
      retryListenersAttached = true;
    } else if (!preference) {
      gate.showModal();
    }
  };

  startCoverExperience();
}

document.querySelectorAll(".song-audio").forEach((audio) => {
  const player = audio.closest(".audio-panel");
  const status = player.querySelector(".audio-status");
  const introDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 3000;
  let loadFailed = false;
  let introFinished = false;
  let needsGesture = false;
  let hasPlayed = false;
  let silenceDialogOpen = false;

  const silenceDialog = document.createElement("dialog");
  silenceDialog.className = "audio-gate";
  silenceDialog.setAttribute("aria-labelledby", "song-silence-title");
  silenceDialog.setAttribute("aria-describedby", "song-silence-description");
  silenceDialog.innerHTML = `
    <div class="audio-gate-content">
      <p class="eyebrow">Una ofrenda sonora</p>
      <h2 id="song-silence-title">La música se ha silenciado</h2>
      <p id="song-silence-description" class="audio-gate-description">
        La canción dejó de sonar. ¿Quieres reanudarla?
      </p>
      <p class="audio-gate-status" data-song-silence-status aria-live="polite"></p>
      <div class="audio-gate-actions">
        <button class="button button-primary" type="button" data-resume-song>Reanudar música</button>
        <button class="button button-secondary" type="button" data-dismiss-song-silence>Ahora no</button>
      </div>
    </div>`;
  document.body.append(silenceDialog);

  const silenceStatus = silenceDialog.querySelector("[data-song-silence-status]");
  const showSilenceDialog = () => {
    if (silenceDialogOpen || !hasPlayed || loadFailed) {
      return;
    }

    silenceDialogOpen = true;
    silenceStatus.textContent = "";
    silenceDialog.showModal();
  };

  silenceDialog.querySelector("[data-resume-song]").addEventListener("click", async () => {
    silenceStatus.textContent = "Reanudando la canción…";
    try {
      if (audio.ended) {
        audio.currentTime = 0;
      }
      audio.muted = false;
      if (audio.volume === 0) {
        audio.volume = 1;
      }
      await audio.play();
      silenceDialog.close();
      silenceDialogOpen = false;
    } catch {
      silenceStatus.textContent = "No se pudo reanudar. Comprueba el sonido del dispositivo e inténtalo de nuevo.";
    }
  });

  silenceDialog.querySelector("[data-dismiss-song-silence]").addEventListener("click", () => {
    silenceDialog.close();
    silenceDialogOpen = false;
  });

  silenceDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    silenceDialog.close();
    silenceDialogOpen = false;
  });

  const revealPage = () => {
    document.body.classList.remove("is-intro");
    document.body.classList.add("is-revealing");
    window.setTimeout(() => document.body.classList.remove("is-revealing"), 700);
  };

  const startPlayback = async () => {
    loadFailed = false;
    status.textContent = "Preparando la música de esta parada…";

    try {
      audio.currentTime = 0;
      await audio.play();
      hasPlayed = true;
      status.textContent = "Reproduciendo la canción de esta parada.";
      needsGesture = false;
      sessionStorage.removeItem(authorizationAttemptKey);
      return true;
    } catch (error) {
      if (error.name === "NotAllowedError") {
        needsGesture = true;
        if (sessionStorage.getItem(authorizationAttemptKey) === "used") {
          status.textContent =
            "El navegador sigue bloqueando el audio. Revisa los permisos de sonido del sitio o vuelve a la portada para autorizarlo.";
        } else {
          sessionStorage.setItem(authorizationAttemptKey, "used");
          sessionStorage.setItem(pendingSongKey, window.location.href);
          status.textContent = "Abriendo la portada para solicitar autorización de música…";
          const coverUrl = new URL("index.html", window.location.href);
          coverUrl.searchParams.set("audio", "authorize");
          window.location.replace(coverUrl.href);
        }
      } else {
        loadFailed = true;
        status.textContent =
          "No se pudo reproducir el audio. Comprueba que el archivo MP3 esté en la carpeta indicada.";
      }
      return false;
    }
  };

  const retryAfterInteraction = async () => {
    if (!needsGesture) {
      return;
    }

    try {
      await audio.play();
      needsGesture = false;
      status.textContent = "Reproduciendo la canción de esta parada.";
    } catch {
      status.textContent =
        "El navegador sigue bloqueando el audio. Revisa los permisos de sonido del sitio.";
    }
  };

  const finishIntro = () => {
    introFinished = true;
    if (localStorage.getItem(preferenceKey) !== "enabled") {
      status.textContent = "La música está desactivada durante esta visita.";
    }
    revealPage();
  };

  audio.addEventListener("play", () => {
    hasPlayed = true;
    status.textContent = "Reproduciendo la canción de esta parada.";
    if (silenceDialogOpen) {
      silenceDialog.close();
      silenceDialogOpen = false;
    }
  });

  audio.addEventListener("pause", () => {
    if (!loadFailed) {
      status.textContent = "Audio en pausa.";
    }
    showSilenceDialog();
  });

  audio.addEventListener("volumechange", () => {
    if (hasPlayed && (audio.muted || audio.volume === 0)) {
      showSilenceDialog();
    }
  });

  audio.addEventListener("ended", () => {
    status.textContent = "La canción ha terminado.";
    showSilenceDialog();
  });

  audio.addEventListener("error", () => {
    loadFailed = true;
    status.textContent = "No se pudo cargar el audio. Comprueba que el archivo MP3 esté en la carpeta indicada.";
    if (introFinished) {
      revealPage();
    }
  });

  document.body.classList.add("is-intro");
  if (localStorage.getItem(preferenceKey) === "enabled") {
    startPlayback();
    document.addEventListener("pointerdown", retryAfterInteraction);
    document.addEventListener("keydown", retryAfterInteraction);
  } else {
    status.textContent = "La música está desactivada durante esta visita.";
  }
  window.setTimeout(finishIntro, introDuration);
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const link = event.target.closest("a[href]");
  if (
    !link ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    link.target ||
    link.hasAttribute("download")
  ) {
    return;
  }

  const destination = new URL(link.href, window.location.href);
  if (
    destination.origin !== window.location.origin ||
    !destination.pathname.endsWith(".html") ||
    destination.pathname === window.location.pathname
  ) {
    return;
  }

  event.preventDefault();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.assign(destination.href);
    return;
  }

  document.body.classList.add("is-leaving");
  window.setTimeout(() => window.location.assign(destination.href), 180);
});

const journeySongs = [
  { file: "coco.html", title: "El Coco", artist: "Los Folkloristas", cover: "el-coco.jpg" },
  { file: "mariaflor.html", title: "María Flor", artist: "Pedro Arturo", cover: "maria-flor.jfif" },
  { file: "elsondelosdifuntos.html", title: "Son de difuntos", artist: "Lila Downs", cover: "son-de-difuntos.jfif" },
  { file: "novolvere.html", title: "No volveré", artist: "Chavela Vargas", cover: "no-volvere.png" },
  { file: "la-bruja.html", title: "La Bruja", artist: "Tlen Huicani", cover: "la-bruja.jfif" },
  { file: "la-llorona-nahuatl.html", title: "La Llorona", artist: "Versión en náhuatl", cover: "la-llorona-nahuatl.jfif" },
  { file: "nostalgia.html", title: "Nostalgia", artist: "Los Malagueña", cover: "nostalgia.jfif" },
  { file: "viene-la-muerte.html", title: "Viene la muerte", artist: "Lila Downs", cover: "viene-la-muerte.jfif" },
  { file: "amor-eterno.html", title: "Amor eterno", artist: "Juan Gabriel", cover: "amor-eterno.jfif" },
  { file: "la-martiniana.html", title: "La Martiniana", artist: "Tradición de Oaxaca", cover: "la-martiniana.png" },
  { file: "dios-nunca-muere.html", title: "Dios nunca muere", artist: "Lila Downs", cover: "dios-nunca-muere.png" },
  { file: "esperame-en-el-cielo.html", title: "Espérame en el cielo", artist: "Los Panchos", cover: "esperame-en-el-cielo.png" }
];
const currentSongFile = window.location.pathname.split("/").pop();
const currentSongIndex = journeySongs.findIndex((song) => song.file === currentSongFile);

if (document.body.classList.contains("song-page") && currentSongIndex !== -1) {
  const journeyStorageKey = "ecos-del-mas-alla-visited-songs";
  const visitedSongs = new Set(
    (sessionStorage.getItem(journeyStorageKey) || "")
      .split(",")
      .filter((file) => journeySongs.some((song) => song.file === file))
  );
  visitedSongs.add(currentSongFile);
  sessionStorage.setItem(journeyStorageKey, [...visitedSongs].join(","));

  const journeyMap = document.createElement("details");
  journeyMap.className = "journey-map";

  const summary = document.createElement("summary");
  summary.className = "journey-map-summary";
  summary.textContent = `Explora las 12 paradas · ${visitedSongs.size} visitadas`;
  journeyMap.append(summary);

  const progress = document.createElement("progress");
  progress.className = "journey-map-progress";
  progress.max = journeySongs.length;
  progress.value = visitedSongs.size;
  progress.setAttribute("aria-label", `${visitedSongs.size} de 12 paradas visitadas`);
  journeyMap.append(progress);

  const songList = document.createElement("ol");
  songList.className = "journey-map-list";
  journeySongs.forEach((song, index) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = song.file;
    if (index === currentSongIndex) {
      link.setAttribute("aria-current", "step");
      item.classList.add("is-current");
    } else if (visitedSongs.has(song.file)) {
      item.classList.add("is-visited");
    }

    const number = document.createElement("span");
    number.className = "journey-map-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const text = document.createElement("span");
    text.className = "journey-map-text";
    const title = document.createElement("span");
    title.className = "journey-map-title";
    title.textContent = song.title;
    const artist = document.createElement("span");
    artist.className = "journey-map-artist";
    artist.textContent = song.artist;
    text.append(title, artist);

    const state = document.createElement("span");
    state.className = "journey-map-state";
    state.textContent =
      index === currentSongIndex
        ? "Estás aquí"
        : visitedSongs.has(song.file)
          ? "Visitada"
          : "Por escuchar";

    link.append(number, text, state);
    item.append(link);
    songList.append(item);
  });
  journeyMap.append(songList);

  const songHero = document.querySelector(".song-hero");
  if (songHero) {
    songHero.insertAdjacentElement("afterend", journeyMap);
  }

  const offeringsStorageKey = "ecos-del-mas-alla-offerings";
  const memorialNameStorageKey = "ecos-del-mas-alla-memorial-name";
  const activity = document.createElement("section");
  activity.className = "participation-panel";
  activity.setAttribute("aria-label", "Dedica canciones en Ecos del más allá");
  activity.innerHTML = `
    <details class="altar-builder">
      <summary><span aria-hidden="true">✿</span><span>Dedica esta canción en Ecos del más allá</span><span class="altar-builder-count" data-altar-count></span></summary>
      <form class="offering-form" data-offering-form>
        <div class="altar-progress">
          <progress data-altar-progress max="${journeySongs.length}" value="0" aria-label="Dedicatorias agregadas a la ofrenda"></progress>
          <p data-altar-progress-label aria-live="polite">0 de ${journeySongs.length} canciones tienen una dedicatoria.</p>
        </div>
        <div class="offering-choices" role="group" aria-label="Elige un elemento para tu ofrenda">
          <button class="offering-choice" type="button" data-offering-item="flower" aria-pressed="true"><span aria-hidden="true">✿</span><span>Flor</span></button>
          <button class="offering-choice" type="button" data-offering-item="candle" aria-pressed="false"><span aria-hidden="true">🕯</span><span>Veladora</span></button>
          <button class="offering-choice" type="button" data-offering-item="memory" aria-pressed="false"><span aria-hidden="true">♡</span><span>Recuerdo</span></button>
        </div>
        <label class="offering-field" for="offering-person">Nombre de la persona homenajeada</label>
        <input class="offering-input" id="offering-person" name="person" type="text" maxlength="60" autocomplete="off" placeholder="Escribe el nombre para la ofrenda" required>
        <label class="offering-field" for="offering-note">Dedicatoria para esta canción</label>
        <textarea class="offering-note" id="offering-note" name="dedication" maxlength="140" rows="2" placeholder="Escribe unas palabras para recordarle" required></textarea>
        <div class="offering-actions">
          <button class="button button-primary offering-submit" type="submit">Añadir dedicatoria de esta canción</button>
          <button class="button button-secondary offering-clear" type="button" data-clear-offerings>Vaciar ofrenda</button>
        </div>
        <p class="offering-status" data-offering-status aria-live="polite"></p>
      </form>
      <div class="virtual-altar-items" data-altar-items aria-live="polite"></div>
    </details>`;

  const journeyNav = document.querySelector(".journey-nav");
  if (journeyNav) {
    journeyNav.insertAdjacentElement("beforebegin", activity);
  }

  const offeringForm = activity.querySelector("[data-offering-form]");
  const personInput = activity.querySelector("#offering-person");
  const dedicationInput = activity.querySelector("#offering-note");
  const offeringStatus = activity.querySelector("[data-offering-status]");
  const altarItems = activity.querySelector("[data-altar-items]");
  const altarCount = activity.querySelector("[data-altar-count]");
  const altarProgress = activity.querySelector("[data-altar-progress]");
  const altarProgressLabel = activity.querySelector("[data-altar-progress-label]");
  const offeringSubmit = activity.querySelector(".offering-submit");
  const offeringClear = activity.querySelector("[data-clear-offerings]");
  const offeringTitles = { flower: "Flor", candle: "Veladora", memory: "Recuerdo" };
  let selectedOffering = "flower";
  let offerings = [];
  let sharedMemorialName = "";

  try {
    const savedOfferings = JSON.parse(sessionStorage.getItem(offeringsStorageKey) || "[]");
    sharedMemorialName = sessionStorage.getItem(memorialNameStorageKey) || "";
    const seenSongs = new Set();
    offerings = Array.isArray(savedOfferings)
      ? savedOfferings.reduce((validOfferings, offering) => {
          const song = offering && journeySongs.find(
            (item) => item.file === offering.songFile || item.title === offering.song
          );
          if (
            !offering ||
            !song ||
            !Object.prototype.hasOwnProperty.call(offeringTitles, offering.type) ||
            seenSongs.has(song.file)
          ) {
            return validOfferings;
          }

          seenSongs.add(song.file);
          validOfferings.push({
            songFile: song.file,
            song: song.title,
            type: offering.type,
            title: offeringTitles[offering.type],
            personName: typeof offering.personName === "string" ? offering.personName.slice(0, 60) : "",
            dedication: typeof offering.dedication === "string" ? offering.dedication.slice(0, 140) : ""
          });
          return validOfferings;
        }, [])
      : [];
    if (!sharedMemorialName) {
      sharedMemorialName = offerings.find((offering) => offering.personName)?.personName || "";
    }
    if (sharedMemorialName) {
      sessionStorage.setItem(memorialNameStorageKey, sharedMemorialName);
      offerings = offerings.map((offering) => ({ ...offering, personName: sharedMemorialName }));
    }
    sessionStorage.setItem(offeringsStorageKey, JSON.stringify(offerings));
  } catch {
    sessionStorage.removeItem(offeringsStorageKey);
  }

  const renderOfferings = () => {
    altarItems.replaceChildren();
    const currentOffering = offerings.find((offering) => offering.songFile === currentSongFile);
    if (currentOffering) {
      selectedOffering = currentOffering.type;
    }
    personInput.value = sharedMemorialName || currentOffering?.personName || "";
    dedicationInput.value = currentOffering?.dedication || "";
    altarCount.textContent = `${offerings.length} de ${journeySongs.length} dedicatorias`;
    altarProgress.value = offerings.length;
    altarProgressLabel.textContent =
      offerings.length === journeySongs.length
        ? "Tu ofrenda está completa: las 12 canciones tienen una dedicatoria."
        : `${offerings.length} de ${journeySongs.length} canciones tienen una dedicatoria.`;
    offeringSubmit.disabled = !currentOffering && offerings.length >= journeySongs.length;
    offeringSubmit.textContent = currentOffering
      ? "Guardar dedicatoria de esta canción"
      : "Añadir dedicatoria de esta canción";
    offeringClear.disabled = offerings.length === 0;
    activity.querySelectorAll("[data-offering-item]").forEach((choice) => {
      choice.disabled = false;
      choice.setAttribute("aria-pressed", String(choice.dataset.offeringItem === selectedOffering));
    });

    if (offerings.length === 0) {
      const empty = document.createElement("p");
      empty.className = "virtual-altar-empty";
      empty.textContent = "Escribe una dedicatoria para las canciones de Ecos del más allá.";
      altarItems.append(empty);
    }

    offerings.forEach((offering) => {
      const item = document.createElement("article");
      item.className = "virtual-altar-item";
      const symbol = document.createElement("span");
      symbol.className = "virtual-altar-symbol";
      symbol.setAttribute("aria-hidden", "true");
      symbol.textContent = offering.type === "candle" ? "🕯" : offering.type === "memory" ? "♡" : "✿";
      const copy = document.createElement("div");
      copy.className = "virtual-altar-copy";
      const title = document.createElement("strong");
      title.textContent = offering.title;
      const song = document.createElement("span");
      song.textContent = offering.song;
      copy.append(title, song);
      if (offering.personName) {
        const person = document.createElement("span");
        person.dataset.memorialName = "";
        person.textContent = `En memoria de ${offering.personName}`;
        copy.append(person);
      }
      if (offering.dedication) {
        const note = document.createElement("p");
        note.textContent = offering.dedication;
        copy.append(note);
      }
      item.append(symbol, copy);
      altarItems.append(item);
    });
  };

  activity.querySelectorAll("[data-offering-item]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedOffering = button.dataset.offeringItem;
      activity.querySelectorAll("[data-offering-item]").forEach((choice) => {
        choice.setAttribute("aria-pressed", String(choice === button));
      });
      offeringStatus.textContent = `${button.lastElementChild.textContent} elegido para tu ofrenda.`;
    });
  });

  personInput.addEventListener("input", () => {
    sharedMemorialName = personInput.value.trim();
    sessionStorage.setItem(memorialNameStorageKey, sharedMemorialName);
    offerings = offerings.map((offering) => ({ ...offering, personName: sharedMemorialName }));
    sessionStorage.setItem(offeringsStorageKey, JSON.stringify(offerings));
    altarItems.querySelectorAll("[data-memorial-name]").forEach((person) => {
      person.textContent = sharedMemorialName ? `En memoria de ${sharedMemorialName}` : "";
    });
  });

  offeringForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sharedMemorialName = personInput.value.trim();
    sessionStorage.setItem(memorialNameStorageKey, sharedMemorialName);
    offerings = offerings.map((offering) => ({ ...offering, personName: sharedMemorialName }));
    if (offerings.some((offering) => offering.songFile === currentSongFile)) {
      const currentIndex = offerings.findIndex((offering) => offering.songFile === currentSongFile);
      offerings[currentIndex] = {
        ...offerings[currentIndex],
        type: selectedOffering,
        title: offeringTitles[selectedOffering],
        personName: personInput.value.trim(),
        dedication: dedicationInput.value.trim()
      };
      offeringStatus.textContent = `Actualizaste la dedicatoria para ${journeySongs[currentSongIndex].title}.`;
    } else {
      offerings.push({
        songFile: currentSongFile,
        type: selectedOffering,
        title: offeringTitles[selectedOffering],
        song: journeySongs[currentSongIndex].title,
        personName: personInput.value.trim(),
        dedication: dedicationInput.value.trim()
      });
      offeringStatus.textContent = `Agregaste la dedicatoria de ${journeySongs[currentSongIndex].title} a tu ofrenda.`;
    }
    sessionStorage.setItem(offeringsStorageKey, JSON.stringify(offerings));
    renderOfferings();
  });

  activity.querySelector("[data-clear-offerings]").addEventListener("click", () => {
    offerings = [];
    sessionStorage.removeItem(offeringsStorageKey);
    offeringStatus.textContent = "Tu ofrenda quedó vacía. Puedes comenzar de nuevo.";
    renderOfferings();
  });

  renderOfferings();
}
