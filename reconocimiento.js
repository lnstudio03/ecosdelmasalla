const form = document.querySelector("#recognition-form");
const nameInput = document.querySelector("#display-name");
const offeringNameInput = document.querySelector("#offering-name");
const themeInput = document.querySelector("#certificate-theme");
const preview = document.querySelector("#recognition-preview");
const canvas = document.querySelector("#recognition-canvas");
const status = document.querySelector("#recognition-status");
const altarCanvas = document.querySelector("#digital-altar-canvas");
const altarProgress = document.querySelector("#digital-altar-progress");
const altarStatus = document.querySelector("#digital-altar-status");
const recognitionDownloadButton = document.querySelector("#download-recognition");
const offeringDownloadButton = document.querySelector("#download-offering");
const backgroundAudio = document.querySelector("#recognition-background-audio");
const audioStatus = document.querySelector("#recognition-audio-status");
const context = canvas.getContext("2d");
const altarContext = altarCanvas.getContext("2d");
const fixedDedication =
  "Para quienes viven en nuestra memoria. Que cada canción sea una luz en el camino.";
const memorialNameStorageKey = "ecos-del-mas-alla-memorial-name";
const recognitionNameStorageKey = "ecos-del-mas-alla-recognition-name";
const themes = {
  noche: {
    background: ["#241723", "#17111a", "#301a23"],
    border: "#d4af37",
    innerBorder: "rgba(240, 217, 139, 0.7)",
    accent: "#f0d98b",
    text: "#fff4df",
    muted: "#d2c9bf",
    petals: ["#e77818", "#f5a623"],
    center: "#7e351c"
  },
  cempasuchil: {
    background: ["#332011", "#1d170f", "#3b2411"],
    border: "#f0a52e",
    innerBorder: "rgba(255, 213, 122, 0.76)",
    accent: "#ffd782",
    text: "#fff6df",
    muted: "#e5d1ad",
    petals: ["#ed7417", "#ffb52e"],
    center: "#8d351d"
  },
  violeta: {
    background: ["#25162d", "#17111f", "#37203a"],
    border: "#d8a4d8",
    innerBorder: "rgba(240, 204, 237, 0.7)",
    accent: "#f0cbed",
    text: "#fff4ff",
    muted: "#dbc9dc",
    petals: ["#d876a8", "#f0b5d0"],
    center: "#703751"
  }
};

const songCoverImages = Promise.all(
  journeySongs.map((song) =>
    new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve([song.file, image]);
      image.onerror = () => resolve([song.file, null]);
      image.src = new URL(song.cover, document.baseURI).href;
    })
  )
);

const drawMarigold = (ctx, x, y, radius, theme) => {
  ctx.save();
  ctx.translate(x, y);
  for (let petal = 0; petal < 16; petal += 1) {
    ctx.rotate((Math.PI * 2) / 16);
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.62, radius * 0.16, radius * 0.46, 0, 0, Math.PI * 2);
    ctx.fillStyle = theme.petals[petal % theme.petals.length];
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = theme.center;
  ctx.fill();
  ctx.restore();
};

const fitNameFont = (ctx, name, maxWidth) => {
  let fontSize = 116;
  do {
    ctx.font = `600 ${fontSize}px "Cinzel", "Palatino Linotype", Georgia, serif`;
    fontSize -= 2;
  } while (ctx.measureText(name).width > maxWidth && fontSize > 48);
};

const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) {
    lines.push(line);
  }

  const visibleLines = lines.slice(0, 3);
  visibleLines.forEach((visibleLine, index) => {
    ctx.fillText(visibleLine, x, y + index * lineHeight);
  });
};

const drawCenteredWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) {
    lines.push(line);
  }

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const finalLine = visibleLines[maxLines - 1];
    visibleLines[maxLines - 1] = `${finalLine.replace(/[.,;:!?]?$/, "")}…`;
  }
  visibleLines.forEach((visibleLine, index) => {
    ctx.fillText(visibleLine, x, y + index * lineHeight, maxWidth);
  });
};

const drawCertificate = (name) => {
  const { width, height } = canvas;
  const theme = themes[themeInput.value] || themes.noche;
  const gradient = context.createLinearGradient(0, 0, width, height);
  theme.background.forEach((color, index) => {
    gradient.addColorStop(index / (theme.background.length - 1), color);
  });
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = theme.border;
  context.lineWidth = 8;
  context.strokeRect(44, 44, width - 88, height - 88);
  context.strokeStyle = theme.innerBorder;
  context.lineWidth = 2;
  context.strokeRect(66, 66, width - 132, height - 132);

  drawMarigold(context, 132, 132, 54, theme);
  drawMarigold(context, width - 132, 132, 54, theme);
  drawMarigold(context, 132, height - 132, 54, theme);
  drawMarigold(context, width - 132, height - 132, 54, theme);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = theme.accent;
  context.font = '700 36px "Lora", Georgia, serif';
  context.letterSpacing = "5px";
  context.fillText("ECOS DEL MÁS ALLÁ", width / 2, 175);

  context.fillStyle = theme.text;
  context.font = '600 72px "Cinzel", "Palatino Linotype", Georgia, serif';
  context.fillText("RECONOCIMIENTO", width / 2, 300, width - 300);

  context.fillStyle = theme.muted;
  context.font = '400 30px "Lora", Georgia, serif';
  context.letterSpacing = "0px";
  context.fillText("Se otorga el presente reconocimiento a", width / 2, 420, width - 300);

  fitNameFont(context, name, width - 320);
  context.fillStyle = theme.accent;
  context.fillText(name, width / 2, 525, width - 320);

  context.fillStyle = theme.muted;
  context.font = '600 27px "Lora", Georgia, serif';
  context.fillText("POR HABER CONCLUIDO EL RECORRIDO DE", width / 2, 645, width - 300);

  context.fillStyle = theme.accent;
  context.font = '600 52px "Cinzel", "Palatino Linotype", Georgia, serif';
  context.fillText("ECOS DEL MÁS ALLÁ", width / 2, 715);

  context.fillStyle = theme.text;
  context.font = '400 28px "Lora", Georgia, serif';
  drawCenteredWrappedText(
    context,
    "Una experiencia de música, memoria y tradición dedicada a honrar a quienes permanecen en nuestros corazones.",
    width / 2,
    800,
    width - 340,
    38,
    2
  );

  context.fillStyle = theme.accent;
  context.font = '600 28px "Cinzel", "Palatino Linotype", Georgia, serif';
  context.fillText("DÍA DE MUERTOS · 2026", width / 2, 965);
};

const readOfferings = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem("ecos-del-mas-alla-offerings") || "[]");
    if (!Array.isArray(saved)) {
      throw new Error("Las dedicatorias guardadas no tienen el formato esperado.");
    }
    return saved;
  } catch {
    altarStatus.textContent = "No se pudieron leer todas las dedicatorias guardadas. La imagen conserva las 12 canciones del recorrido.";
    return [];
  }
};

try {
  nameInput.value = sessionStorage.getItem(recognitionNameStorageKey) || "";
  const savedMemorialName = sessionStorage.getItem(memorialNameStorageKey) || "";
  const savedOfferings = JSON.parse(sessionStorage.getItem("ecos-del-mas-alla-offerings") || "[]");
  const offeringNameFromSongs = Array.isArray(savedOfferings)
    ? savedOfferings.find((offering) => typeof offering?.personName === "string" && offering.personName.trim())?.personName
    : "";
  offeringNameInput.value = savedMemorialName || offeringNameFromSongs || "";
  if (offeringNameInput.value) {
    sessionStorage.setItem(memorialNameStorageKey, offeringNameInput.value);
  }
} catch {
  status.textContent = "No se pudieron recuperar los nombres guardados.";
}

const drawOfferingIcon = (ctx, type, x, y, theme) => {
  if (type === "flower") {
    drawMarigold(ctx, x, y, 20, theme);
    return;
  }
  if (type === "candle") {
    ctx.save();
    ctx.fillStyle = theme.accent;
    ctx.fillRect(x - 9, y - 10, 18, 30);
    ctx.beginPath();
    ctx.ellipse(x, y - 15, 5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = theme.petals[0];
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = theme.accent;
  ctx.font = '400 46px Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♡", x, y);
};

const drawAltarPlatform = (ctx, x, y, width, theme) => {
  const topHeight = 18;
  const frontHeight = 38;
  const cloth = ctx.createLinearGradient(0, y, 0, y + frontHeight);
  cloth.addColorStop(0, "#fff6e6");
  cloth.addColorStop(1, "#d8c8a9");

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = cloth;
  ctx.fillRect(x, y, width, frontHeight);
  ctx.restore();

  ctx.fillStyle = "#fff9ec";
  ctx.fillRect(x - 9, y - topHeight, width + 18, topHeight);
  ctx.strokeStyle = "rgba(126, 91, 48, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 9, y - topHeight, width + 18, topHeight);

  ctx.fillStyle = "rgba(125, 86, 47, 0.2)";
  ctx.fillRect(x, y + frontHeight - 4, width, 4);
  ctx.strokeStyle = "rgba(152, 112, 62, 0.52)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + frontHeight);
  ctx.lineTo(x + width, y + frontHeight);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  const scallopWidth = 34;
  ctx.fillStyle = "#eadcc3";
  for (let scallopX = x + 12; scallopX < x + width - 10; scallopX += scallopWidth) {
    ctx.beginPath();
    ctx.arc(scallopX, y + frontHeight - 1, scallopWidth / 2, 0, Math.PI);
    ctx.fill();
    drawMarigold(ctx, scallopX, y + 15, 8, theme);
  }
};

const drawAltarCover = (ctx, song, offering, coverImage, x, y, slotWidth, theme) => {
  const coverWidth = Math.min(174, slotWidth - 42);
  const coverHeight = 112;
  const coverX = x + (slotWidth - coverWidth) / 2;
  const coverY = y;
  if (coverImage) {
    const scale = Math.max(coverWidth / coverImage.naturalWidth, coverHeight / coverImage.naturalHeight);
    const cropWidth = coverWidth / scale;
    const cropHeight = coverHeight / scale;
    const cropX = (coverImage.naturalWidth - cropWidth) / 2;
    const cropY = (coverImage.naturalHeight - cropHeight) / 2;
    ctx.drawImage(
      coverImage,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      coverX,
      coverY,
      coverWidth,
      coverHeight
    );
  } else {
    const fallback = ctx.createLinearGradient(coverX, coverY, coverX + coverWidth, coverY + coverHeight);
    fallback.addColorStop(0, "#7a442d");
    fallback.addColorStop(1, "#2a1b22");
    ctx.fillStyle = fallback;
    ctx.fillRect(coverX, coverY, coverWidth, coverHeight);
    drawMarigold(ctx, coverX + coverWidth / 2, coverY + coverHeight / 2, 28, theme);
  }
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(coverX, coverY, coverWidth, coverHeight);

  if (offering?.type) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(coverX + coverWidth - 2, coverY + coverHeight - 2, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#251923";
    ctx.fill();
    ctx.translate(coverX + coverWidth - 2, coverY + coverHeight - 2);
    ctx.scale(0.58, 0.58);
    drawOfferingIcon(ctx, offering.type, 0, 0, theme);
    ctx.restore();
  }

  const centerX = x + slotWidth / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.text;
  ctx.font = '600 24px "Cinzel", "Palatino Linotype", Georgia, serif';
  drawCenteredWrappedText(ctx, song.title, centerX, coverY + 137, slotWidth - 16, 25, 2);
  ctx.fillStyle = theme.muted;
  ctx.font = '400 17px "Lora", Georgia, serif';
  ctx.fillText(song.artist, centerX, coverY + 169, slotWidth - 16);

  if (offering?.dedication) {
    ctx.fillStyle = theme.text;
    ctx.font = '400 14px "Lora", Georgia, serif';
    drawCenteredWrappedText(
      ctx,
      offering.dedication,
      centerX,
      coverY + 192,
      slotWidth - 26,
      17,
      2
    );
  }
};

const drawDigitalAltar = async () => {
  altarStatus.textContent = "";

  if (!altarContext) {
    altarStatus.textContent = "Este navegador no permite crear la imagen de la ofrenda musical.";
    return;
  }

  const { width, height } = altarCanvas;
  const theme = themes[themeInput.value] || themes.noche;
  const gradient = altarContext.createLinearGradient(0, 0, width, height);
  theme.background.forEach((color, index) => {
    gradient.addColorStop(index / (theme.background.length - 1), color);
  });
  altarContext.fillStyle = gradient;
  altarContext.fillRect(0, 0, width, height);

  const glow = altarContext.createRadialGradient(width / 2, 530, 80, width / 2, 530, 850);
  glow.addColorStop(0, "rgba(240, 166, 46, 0.14)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  altarContext.fillStyle = glow;
  altarContext.fillRect(0, 0, width, height);

  altarContext.strokeStyle = "rgba(240, 217, 139, 0.35)";
  altarContext.lineWidth = 2;
  altarContext.strokeRect(28, 28, width - 56, height - 56);

  altarContext.textAlign = "center";
  altarContext.textBaseline = "middle";
  altarContext.fillStyle = theme.accent;
  altarContext.font = '700 36px "Lora", Georgia, serif';
  altarContext.fillText("MÚSICA · MEMORIA · TRADICIÓN", width / 2, 72);
  altarContext.fillStyle = theme.text;
  altarContext.font = '600 58px "Cinzel", "Palatino Linotype", Georgia, serif';
  altarContext.fillText("ECOS DEL MÁS ALLÁ", width / 2, 135);
  altarContext.fillStyle = theme.muted;
  altarContext.font = '400 26px "Lora", Georgia, serif';
  altarContext.fillText(
    offeringNameInput.value.trim()
      ? `En memoria de ${offeringNameInput.value.trim()}`
      : "Doce canciones para mantener viva la memoria",
    width / 2,
    185
  );

  const offerings = readOfferings();
  const coverImages = new Map(await songCoverImages);
  const offeringsBySong = new Map(
    offerings
      .filter(
        (offering) =>
          typeof offering?.dedication === "string" &&
          offering.dedication.trim() &&
          journeySongs.some((song) => song.file === offering.songFile)
      )
      .map((offering) => [
        offering.songFile,
        { ...offering, personName: offeringNameInput.value.trim() || offering.personName }
      ])
  );
  const levels = [
    { start: 0, count: 4, x: 260, width: 1080, portraitsY: 210, platformY: 465 },
    { start: 4, count: 4, x: 170, width: 1260, portraitsY: 475, platformY: 730 },
    { start: 8, count: 4, x: 80, width: 1440, portraitsY: 740, platformY: 995 }
  ];

  levels.forEach((level) => {
    const slotWidth = level.width / level.count;
    for (let index = level.start; index < level.start + level.count; index += 1) {
      const song = journeySongs[index];
      const slotX = level.x + (index - level.start) * slotWidth;
      const offering = offeringsBySong.get(song.file);
      drawAltarCover(
        altarContext,
        song,
        offering,
        coverImages.get(song.file),
        slotX,
        level.portraitsY,
        slotWidth,
        theme
      );
    }
    drawAltarPlatform(altarContext, level.x, level.platformY, level.width, theme);
  });

  [76, width - 76].forEach((x) => {
    altarContext.save();
    altarContext.translate(x, 1085);
    altarContext.scale(2.2, 2.2);
    drawOfferingIcon(altarContext, "candle", 0, 0, theme);
    altarContext.restore();
  });

  altarContext.textAlign = "center";
  altarContext.textBaseline = "middle";
  altarContext.fillStyle = theme.accent;
  altarContext.font = '600 30px "Cinzel", "Palatino Linotype", Georgia, serif';
  altarContext.fillText("CON CARIÑO, EN MEMORIA", width / 2, 1070);
  altarContext.fillStyle = theme.muted;
  altarContext.font = '400 21px "Lora", Georgia, serif';
  altarContext.fillText("Cada canción guarda un nombre y una historia.", width / 2, 1108);

  for (let flowerX = 390; flowerX <= 1210; flowerX += 82) {
    drawMarigold(altarContext, flowerX, 1170, 16, theme);
  }

  altarProgress.textContent = "Tu ofrenda está lista.";
};

const updatePreview = async () => {
  recognitionDownloadButton.disabled = !nameInput.value.trim() || !context;
  offeringDownloadButton.disabled = true;
  await drawDigitalAltar();
  const name = nameInput.value.trim();
  const offeringName = offeringNameInput.value.trim();
  offeringDownloadButton.disabled = !offeringName || !altarContext;
  if (!name || !context) {
    preview.hidden = true;
  } else {
    drawCertificate(name);
    canvas.setAttribute("aria-label", `Vista previa del reconocimiento para ${name}`);
    preview.hidden = false;
  }
  altarCanvas.setAttribute(
    "aria-label",
    `Vista previa de la ofrenda de Ecos del más allá para ${offeringName || "la persona homenajeada"}`
  );
  if (name && offeringName) {
    status.textContent = "Las vistas previas están actualizadas.";
  }
};

const safeFilename = (name, fallback) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const downloadCanvas = (targetCanvas, filename) => {
  const dataUrl = targetCanvas.toDataURL("image/png");
  const [metadata, encodedData] = dataUrl.split(",");
  if (!metadata || !encodedData) {
    throw new Error("No se pudo preparar la imagen para descargar.");
  }
  const binaryData = atob(encodedData);
  const bytes = new Uint8Array(binaryData.length);
  for (let index = 0; index < binaryData.length; index += 1) {
    bytes[index] = binaryData.charCodeAt(index);
  }
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

const downloadRecognition = () => {
  if (!form.reportValidity()) {
    return;
  }
  if (!context) {
    status.textContent = "Este navegador no permite crear el reconocimiento.";
    return;
  }
  try {
    drawCertificate(nameInput.value.trim());
    downloadCanvas(
      canvas,
      `reconocimiento-${safeFilename(nameInput.value.trim(), "participante")}.png`
    );
    status.textContent = "Se descargó el reconocimiento.";
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : "No se pudo descargar el reconocimiento.";
  }
};

const downloadOffering = () => {
  if (!offeringNameInput.reportValidity()) {
    return;
  }
  if (!altarContext) {
    altarStatus.textContent = "Este navegador no permite crear la imagen de la ofrenda musical.";
    return;
  }
  try {
    downloadCanvas(
      altarCanvas,
      `ecos-del-mas-alla-ofrenda-${safeFilename(offeringNameInput.value.trim(), "homenaje")}.png`
    );
    altarStatus.textContent = "Se descargó la imagen de la ofrenda.";
  } catch (error) {
    altarStatus.textContent =
      error instanceof Error ? error.message : "No se pudo descargar la imagen de la ofrenda.";
  }
};

nameInput.addEventListener("input", () => {
  try {
    sessionStorage.setItem(recognitionNameStorageKey, nameInput.value.trim());
  } catch {
    status.textContent = "No se pudo guardar el nombre del reconocimiento.";
  }
  updatePreview();
});

offeringNameInput.addEventListener("input", () => {
  try {
    sessionStorage.setItem(memorialNameStorageKey, offeringNameInput.value.trim());
  } catch {
    altarStatus.textContent = "No se pudo guardar el nombre de la ofrenda.";
  }
  updatePreview();
});

themeInput.addEventListener("change", () => {
  updatePreview();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  downloadRecognition();
});

recognitionDownloadButton.addEventListener("click", downloadRecognition);
offeringDownloadButton.addEventListener("click", downloadOffering);

let retryAudioOnInteraction = false;

const retryBackgroundAudio = async () => {
  if (!retryAudioOnInteraction || backgroundAudio.error) {
    return;
  }
  try {
    await backgroundAudio.play();
    retryAudioOnInteraction = false;
    document.removeEventListener("pointerdown", retryBackgroundAudio);
    document.removeEventListener("keydown", retryBackgroundAudio);
  } catch {
    audioStatus.textContent = "El navegador no permitió iniciar la música de fondo.";
  }
};

backgroundAudio.addEventListener("error", () => {
  audioStatus.textContent = "No se pudo cargar «HUMBE - fantasmas.mp3». Comprueba que el archivo esté en la carpeta del sitio.";
});

if (localStorage.getItem("ecos-del-mas-alla-audio") !== "muted") {
  backgroundAudio.play().catch(() => {
    retryAudioOnInteraction = true;
    audioStatus.textContent = "El navegador bloqueó el inicio automático de la música de fondo.";
    document.addEventListener("pointerdown", retryBackgroundAudio);
    document.addEventListener("keydown", retryBackgroundAudio);
  });
}

void updatePreview();
