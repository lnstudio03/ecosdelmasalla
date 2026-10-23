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
        Activa la música para escuchar el tema de la portada y las canciones del recorrido.
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

  const removeRetryListeners = () => {
    if (retryListenersAttached) {
      document.removeEventListener("pointerdown", retryBackgroundAudio);
      document.removeEventListener("keydown", retryBackgroundAudio);
      retryListenersAttached = false;
    }
  };

  const showAuthorizationGate = () => {
    removeRetryListeners();
    gateStatus.textContent =
      "El navegador bloqueó la reproducción automática. Autoriza la música desde esta portada para continuar.";
    gateStatus.hidden = false;
    if (!gate.open) {
      gate.showModal();
    }
  };

  const retryBackgroundAudio = async () => {
    if (audio.paused) {
      try {
        await audio.play();
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
}

document.querySelectorAll(".song-audio").forEach((audio) => {
  const player = audio.closest(".audio-panel");
  const status = player.querySelector(".audio-status");
  const introDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 3000;
  let loadFailed = false;
  let introFinished = false;
  let needsGesture = false;

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
    status.textContent = "Reproduciendo la canción de esta parada.";
  });

  audio.addEventListener("pause", () => {
    if (!loadFailed) {
      status.textContent = "Audio en pausa.";
    }
  });

  audio.addEventListener("ended", () => {
    status.textContent = "La canción ha terminado.";
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
