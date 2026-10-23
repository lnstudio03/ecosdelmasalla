const preferenceKey = "ecos-del-mas-alla-audio";
const coverLink = document.querySelector(".cover-cta[href]");

if (coverLink) {
  const gate = document.createElement("dialog");
  gate.className = "audio-gate";
  gate.setAttribute("aria-labelledby", "audio-gate-title");
  gate.setAttribute("aria-describedby", "audio-gate-description");
  gate.innerHTML = `
    <div class="audio-gate-content">
      <p class="eyebrow">Una ofrenda sonora</p>
      <h2 id="audio-gate-title">¿Quieres escuchar el recorrido?</h2>
      <p id="audio-gate-description" class="audio-gate-description">
        Elige si quieres escuchar las canciones mientras recorres el altar.
        Esta decisión se guardará para que no vuelva a preguntarte.
        El navegador puede bloquear la reproducción automática.
      </p>
      <div class="audio-gate-actions">
        <button class="button button-primary" type="button" data-enable-audio>Activar música</button>
        <button class="button button-secondary" type="button" data-skip-audio>Continuar sin música</button>
      </div>
    </div>`;
  document.body.append(gate);

  const enableAudio = gate.querySelector("[data-enable-audio]");
  const skipAudio = gate.querySelector("[data-skip-audio]");

  coverLink.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      coverLink.target
    ) {
      return;
    }

    if (localStorage.getItem(preferenceKey)) {
      return;
    }

    event.preventDefault();
    gate.showModal();
  });

  enableAudio.addEventListener("click", () => {
    localStorage.setItem(preferenceKey, "enabled");
    window.location.assign(coverLink.href);
  });

  skipAudio.addEventListener("click", () => {
    localStorage.setItem(preferenceKey, "muted");
    window.location.assign(coverLink.href);
  });
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
      await audio.play();
      status.textContent = "Reproduciendo la canción de esta parada.";
      needsGesture = false;
      return true;
    } catch (error) {
      if (error.name === "NotAllowedError") {
        needsGesture = true;
        status.textContent =
          "El navegador bloqueó la reproducción automática. Interactúa con la página para iniciar el audio.";
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
