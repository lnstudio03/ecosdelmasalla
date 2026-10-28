const launchCurtain = document.querySelector("[data-launch-curtain]");
const coverShell = document.querySelector(".cover-shell");

if (launchCurtain && coverShell) {
  const launchAt = new Date("2026-11-01T12:00:00-06:00").getTime();
  const countdownParts = {
    days: launchCurtain.querySelector("[data-countdown-days]"),
    hours: launchCurtain.querySelector("[data-countdown-hours]"),
    minutes: launchCurtain.querySelector("[data-countdown-minutes]"),
    seconds: launchCurtain.querySelector("[data-countdown-seconds]")
  };
  const status = launchCurtain.querySelector("[data-countdown-status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let countdownInterval;

  const unlockCover = () => {
    window.clearInterval(countdownInterval);
    Object.values(countdownParts).forEach((part) => {
      part.textContent = "0";
    });
    status.textContent = "La ofrenda está abierta.";
    coverShell.inert = false;
    document.body.classList.remove("is-counting-down");

    if (reducedMotion) {
      launchCurtain.hidden = true;
      document.dispatchEvent(new Event("launch-unlocked"));
      return;
    }

    launchCurtain.classList.add("is-opening");
    launchCurtain.addEventListener(
      "transitionend",
      () => {
        launchCurtain.hidden = true;
        document.dispatchEvent(new Event("launch-unlocked"));
      },
      { once: true }
    );
    window.setTimeout(() => {
      if (!launchCurtain.hidden) {
        launchCurtain.hidden = true;
        document.dispatchEvent(new Event("launch-unlocked"));
      }
    }, 1400);
  };

  const updateCountdown = () => {
    const remaining = launchAt - Date.now();
    if (remaining <= 0) {
      unlockCover();
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    countdownParts.days.textContent = String(Math.floor(totalSeconds / 86400));
    countdownParts.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
    countdownParts.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    countdownParts.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
  };

  if (Date.now() >= launchAt) {
    launchCurtain.hidden = true;
    coverShell.inert = false;
    document.body.classList.remove("is-counting-down");
  } else {
    document.body.classList.add("is-counting-down");
    updateCountdown();
    countdownInterval = window.setInterval(updateCountdown, 1000);
  }
}
