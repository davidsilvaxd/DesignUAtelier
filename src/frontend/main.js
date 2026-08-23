// ===== ELEMENTOS DEL DOM =====
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const imageModal = document.getElementById("imageModal");
const imgExpanded = document.getElementById("imgExpanded");
const closeModal = document.querySelector(".close-modal");

// Elementos del Stage
const mainPreviewContainer = document.getElementById("mainPreviewContainer");
const downloadBtn = document.getElementById("downloadBtn");
const currentDesignTitle = document.getElementById("currentDesignTitle");
const currentDesignSubtitle = document.getElementById("currentDesignSubtitle");
const galleryList = document.getElementById("galleryList");
const appContainer = document.querySelector(".app-container");
const closeViewerBtn = document.getElementById("closeViewerBtn");

// Botones de Navegación
const prevNavBtn = document.getElementById("prevNavBtn");
const nextNavBtn = document.getElementById("nextNavBtn");

// Elementos de Visión (Carga de Imágenes)
const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadBtn");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const removeImageBtn = document.getElementById("removeImageBtn");

// Elementos del Selector de Camisetas
const shirtSelectorView = document.getElementById("shirtSelectorView");
const shirtDisplayImg = document.getElementById("shirtDisplayImg");
const shirtDisplayName = document.getElementById("shirtDisplayName");
const shirtDisplayDesc = document.getElementById("shirtDisplayDesc");
const selectShirtBtn = document.getElementById("selectShirtBtn");
const designView = document.getElementById("designView");
const shirtBaseImg = document.getElementById("shirtBaseImg");
const stampOverlayImg = document.getElementById("stampOverlayImg");
const designHint = document.getElementById("designHint");
const resetFlowBtn = document.getElementById("resetFlowBtn");
const shirtStampContainer = document.getElementById("shirtStampContainer");

// ===== DATOS DE CAMISETAS =====
const SHIRTS = [
    {
        id: 'classic',
        name: 'Camiseta Clásica',
        description: 'Corte regular para hombre',
        imagePath: '/frontend/tshirt_classic.png'
    },
    {
        id: 'oversize',
        name: 'Camiseta Oversize',
        description: 'Corte amplio y relajado',
        imagePath: '/frontend/tshirt_oversize.png'
    }
];

// ===== ESTADO GLOBAL =====
let selectedFile = null;
let designHistory = []; // Array de objetos { url, title }
let currentIndex = -1;
let currentShirtIndex = 0; // 0 o 1 (índice de la camiseta en preview)
let selectedShirt = null;  // null | SHIRTS[i] (camiseta confirmada)

// Sesión de Memoria: ID único por pestaña para que la IA recuerde la conversación
let sessionId = sessionStorage.getItem("chat_session_id");
if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("chat_session_id", sessionId);
}
console.log("Session ID:", sessionId);

// ===== INICIALIZACIÓN DEL SELECTOR =====
function initShirtSelector() {
    showShirtPreview(currentShirtIndex);
    updateNavButtons();
    updateInputState();
}

function showShirtPreview(index) {
    const shirt = SHIRTS[index];
    shirtDisplayImg.src = shirt.imagePath;
    shirtDisplayName.textContent = shirt.name;
    shirtDisplayDesc.textContent = shirt.description;
    currentDesignTitle.innerText = shirt.name;
    currentDesignSubtitle.innerText = shirt.description;
    updateNavButtons();
}

// ===== SELECCIÓN DE CAMISETA =====
async function selectShirt() {
    const shirt = SHIRTS[currentShirtIndex];

    // Llamar al backend para inicializar la sesión en modo estampado
    try {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('shirt_id', shirt.id);
        formData.append('shirt_name', shirt.name);

        const res = await fetch('/select-shirt', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.session_id) {
            sessionId = data.session_id;
            sessionStorage.setItem('chat_session_id', sessionId);
        }
    } catch (e) {
        console.error('Error al seleccionar camiseta:', e);
    }

    // Actualizar estado global
    selectedShirt = shirt;

    // Transición de vistas
    shirtSelectorView.style.display = 'none';
    designView.style.display = 'flex';
    mainPreviewContainer.classList.remove('empty');
    mainPreviewContainer.classList.add('shirt-mode');

    // Cargar la imagen base de la camiseta
    shirtBaseImg.src = shirt.imagePath;

    // Mostrar botón de cambio
    if (resetFlowBtn) resetFlowBtn.style.display = 'flex';

    // Actualizar header del stage
    currentDesignTitle.innerText = shirt.name;
    currentDesignSubtitle.innerText = 'Describe el estampado que quieres diseñar';

    // Bloquear la navegación entre camisetas
    updateNavButtons();

    // Actualizar el estado del input del chat
    updateInputState();

    // Mensaje de bienvenida en el chat
    addMessage(`✓ **${shirt.name}** seleccionada. Ahora describe el estampado que quieres y lo generaré directamente sobre ella.`, 'bot');

    // En móvil, abrir el visor
    if (appContainer) appContainer.classList.add('viewer-open');
}

// ===== REINICIO DEL FLUJO =====
async function resetFlow() {
    // Limpiar sesión en el backend
    try {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        await fetch('/clear-session', { method: 'POST', body: formData });
    } catch (e) {
        console.error('Error al limpiar sesión:', e);
    }

    // Resetear estado
    selectedShirt = null;
    designHistory = [];
    currentIndex = -1;

    // Limpiar overlay de estampado
    if (stampOverlayImg) {
        stampOverlayImg.src = '';
        stampOverlayImg.style.display = 'none';
    }
    if (shirtBaseImg) {
        shirtBaseImg.style.display = 'block';
    }
    if (designHint) designHint.style.display = 'block';

    // Resetear UI del stage
    designView.style.display = 'none';
    shirtSelectorView.style.display = 'flex';
    mainPreviewContainer.classList.add('empty');
    mainPreviewContainer.classList.remove('shirt-mode');
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (resetFlowBtn) resetFlowBtn.style.display = 'none';

    // Limpiar galería
    galleryList.innerHTML = '';

    // Volver al selector de camisetas
    currentShirtIndex = 0;
    initShirtSelector();
}

// ===== ESTADO DEL INPUT DEL CHAT =====
function updateInputState() {
    if (selectedShirt) {
        input.placeholder = 'Describe el estampado que quieres...';
        input.parentElement.classList.remove('locked');
    } else {
        input.placeholder = 'Selecciona una camiseta para comenzar...';
        input.parentElement.classList.add('locked');
    }
}

// ===== ENVÍO DE MENSAJES =====
sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
    const text = input.value.trim();
    if (!text && !selectedFile) return;

    // GATE: Debe haber una camiseta seleccionada antes de diseñar
    if (!selectedShirt) {
        addSystemMessage('Debes seleccionar una camiseta antes de comenzar a diseñar.');
        input.value = '';
        return;
    }

    // Mostrar mensaje del usuario
    addMessage(text, "user", selectedFile);

    // Preparar FormData
    const formData = new FormData();
    formData.append("text", text || "Analiza esta imagen");
    formData.append("session_id", sessionId);
    if (selectedFile) {
        formData.append("image", selectedFile);
    }

    // Resetear input e imagen
    input.value = "";
    selectedFile = null;
    imageInput.value = "";
    imagePreviewContainer.style.display = "none";

    const typingIndicator = addTypingIndicator();

    try {
        const response = await fetch("/chat", {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (data.session_id) {
            sessionId = data.session_id;
            sessionStorage.setItem("chat_session_id", sessionId);
        }
        removeTypingIndicator(typingIndicator);
        addMessage(data.reply, "bot");
    } catch (error) {
        console.error("Error:", error);
        removeTypingIndicator(typingIndicator);
        addMessage("Error al conectar con la IA", "bot");
    }
}

// ===== GESTIÓN DE MENSAJES =====
function addMessage(text, sender, file = null) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    msgDiv.innerHTML = marked.parse(text || "");

    // Si hay una imagen del usuario, mostrarla
    if (file && sender === "user") {
        const img = document.createElement("img");
        img.classList.add("user-uploaded-image");
        img.src = URL.createObjectURL(file);
        msgDiv.appendChild(img);
    }

    // Buscar imágenes de estampados en la respuesta del bot
    const images = msgDiv.querySelectorAll('img');
    images.forEach(img => {
        if (img.classList.contains('user-uploaded-image')) return;

        const imageUrl = img.src;
        const spanishTitle = getTitleFromUrl(imageUrl);

        // Miniatura en el chat
        const container = document.createElement('div');
        container.classList.add('image-container');
        img.parentNode.insertBefore(container, img);
        container.appendChild(img);

        // Al cargar la imagen del estampado
        img.onload = () => {
            const index = addToHistory(imageUrl, spanishTitle);
            displayStampAtIndex(index);
        };

        // Click en miniatura del chat
        container.addEventListener('click', () => {
            const index = designHistory.findIndex(d => d.url === imageUrl);
            if (index !== -1) displayStampAtIndex(index);
        });
    });

    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

function addSystemMessage(text) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", "bot", "system-message");
    msgDiv.innerHTML = `<span class="system-msg-icon">ℹ️</span> ${text}`;
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

// ===== VISUALIZACIÓN DEL ESTAMPADO SOBRE LA CAMISETA =====
function displayStampAtIndex(index) {
    if (index < 0 || index >= designHistory.length) return;

    currentIndex = index;
    const design = designHistory[index];

    let isStamp = true;
    try {
        const urlObj = new URL(design.url, window.location.origin);
        isStamp = urlObj.searchParams.get('mode') === 'stamp';
    } catch (e) {
        isStamp = !design.url.includes('mode=garment');
    }

    if (isStamp) {
        // Modo estampado regular (PNG superpuesto)
        shirtBaseImg.style.display = 'block';
        stampOverlayImg.style.position = '';
        stampOverlayImg.style.top = '';
        stampOverlayImg.style.left = '';
        stampOverlayImg.style.width = '';
        stampOverlayImg.style.height = '';
        stampOverlayImg.style.maxHeight = '';
        stampOverlayImg.style.mixBlendMode = 'multiply';
    } else {
        // Modo prenda completa (reemplaza visualmente toda la prenda)
        shirtBaseImg.style.display = 'none';
        stampOverlayImg.style.position = 'relative';
        stampOverlayImg.style.top = '0';
        stampOverlayImg.style.left = '0';
        stampOverlayImg.style.width = '100%';
        stampOverlayImg.style.height = '100%';
        stampOverlayImg.style.maxHeight = '100%';
        stampOverlayImg.style.mixBlendMode = 'normal';
    }

    // Mostrar el estampado encima de la camiseta con blend mode
    stampOverlayImg.src = design.url;
    stampOverlayImg.onload = () => {
        stampOverlayImg.style.display = 'block';
        if (designHint) designHint.style.display = 'none';
        // Mostrar botón de descarga solo cuando hay un diseño
        if (downloadBtn) downloadBtn.style.display = 'flex';
        // En móvil, abrir el visor
        if (appContainer) appContainer.classList.add('viewer-open');
    };

    // Actualizar textos del header
    currentDesignTitle.innerText = formatTitle(design.title);
    currentDesignSubtitle.innerText = `${isStamp ? 'Estampado' : 'Diseño'} #${designHistory.length - index} — ${selectedShirt ? selectedShirt.name : ''}`;

    // Marcar miniatura activa en la galería
    const thumbs = galleryList.querySelectorAll('.gallery-thumb');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
}

function addToHistory(url, title) {
    // No duplicar
    const existingIndex = designHistory.findIndex(d => d.url === url);
    if (existingIndex !== -1) return existingIndex;

    // Agregar al inicio (más reciente primero)
    const newDesign = { url, title };
    designHistory.unshift(newDesign);

    // Miniatura en la galería
    const thumb = document.createElement('div');
    thumb.classList.add('gallery-thumb');
    thumb.innerHTML = `<img src="${url}" alt="${title}">`;

    thumb.addEventListener('click', () => {
        const idx = designHistory.findIndex(d => d.url === url);
        if (idx !== -1) displayStampAtIndex(idx);
    });

    galleryList.insertBefore(thumb, galleryList.firstChild);
    return 0;
}

// ===== BOTONES DE NAVEGACIÓN =====
function updateNavButtons() {
    if (!selectedShirt) {
        // Modo selector: navegar entre camisetas
        prevNavBtn.disabled = (currentShirtIndex <= 0);
        nextNavBtn.disabled = (currentShirtIndex >= SHIRTS.length - 1);
    } else {
        // Modo diseño: navegación bloqueada según requerimientos
        prevNavBtn.disabled = true;
        nextNavBtn.disabled = true;
    }
}

prevNavBtn.addEventListener('click', () => {
    if (selectedShirt) return;
    if (currentShirtIndex > 0) {
        currentShirtIndex--;
        showShirtPreview(currentShirtIndex);
    }
});

nextNavBtn.addEventListener('click', () => {
    if (selectedShirt) return;
    if (currentShirtIndex < SHIRTS.length - 1) {
        currentShirtIndex++;
        showShirtPreview(currentShirtIndex);
    }
});

// ===== BOTÓN SELECCIONAR Y RESETEAR =====
if (selectShirtBtn) {
    selectShirtBtn.addEventListener('click', selectShirt);
}

if (resetFlowBtn) {
    resetFlowBtn.addEventListener('click', resetFlow);
}

// ===== LÓGICA DE DESCARGA (Composición Canvas) =====
if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
        if (!selectedShirt || !stampOverlayImg.src || stampOverlayImg.style.display === 'none') {
            return;
        }

        let isStamp = true;
        try {
            const urlObj = new URL(stampOverlayImg.src, window.location.origin);
            isStamp = urlObj.searchParams.get('mode') === 'stamp';
        } catch (e) {
            isStamp = !stampOverlayImg.src.includes('mode=garment');
        }

        if (!isStamp) {
            // Descargar la prenda completa directamente
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const stampImg = new Image();
            stampImg.crossOrigin = "anonymous";
            stampImg.src = stampOverlayImg.src;
            await new Promise(resolve => {
                stampImg.onload = resolve;
                stampImg.onerror = resolve;
            });
            canvas.width = stampImg.naturalWidth || 800;
            canvas.height = stampImg.naturalHeight || 800;
            ctx.drawImage(stampImg, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `DesignU-${selectedShirt.id}-diseno-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            console.log("Descarga de la prenda completa finalizada.");
            return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const shirtImg = new Image();
        const stampImg = new Image();
        shirtImg.crossOrigin = "anonymous";
        stampImg.crossOrigin = "anonymous";

        // Cargar imagen base de la camiseta
        shirtImg.src = selectedShirt.imagePath;
        await new Promise(resolve => {
            shirtImg.onload = resolve;
            shirtImg.onerror = resolve;
        });

        canvas.width = shirtImg.naturalWidth || 800;
        canvas.height = shirtImg.naturalHeight || 800;

        // Fondo blanco
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dibujar la camiseta base
        ctx.drawImage(shirtImg, 0, 0, canvas.width, canvas.height);

        // Cargar el estampado
        stampImg.src = stampOverlayImg.src;
        await new Promise(resolve => {
            stampImg.onload = resolve;
            stampImg.onerror = resolve;
        });

        // Superponer el estampado con blending "multiply"
        ctx.globalCompositeOperation = 'multiply';
        const stampW = canvas.width * 0.6;
        const stampH = stampW;
        const x = (canvas.width - stampW) / 2;
        const y = canvas.height * 0.15;
        ctx.drawImage(stampImg, x, y, stampW, stampH);

        // Descargar como PNG
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `DesignU-${selectedShirt.id}-estampado-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log("Descarga del estampado compuesto completada.");
    });
}

// ===== LÓGICA DE VISIÓN (Carga de Imágenes desde el usuario) =====
uploadBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelection(file);
});

// Pegado desde el portapapeles
input.addEventListener("paste", (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
            const blob = item.getAsFile();
            handleFileSelection(blob);
        }
    }
});

function handleFileSelection(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = "block";
    };
    reader.readAsDataURL(file);
}

removeImageBtn.addEventListener("click", () => {
    selectedFile = null;
    imageInput.value = "";
    imagePreviewContainer.style.display = "none";
});

// ===== FUNCIONES AUXILIARES =====
function getTitleFromUrl(url) {
    try {
        const urlObj = new URL(url, window.location.origin);
        const title = urlObj.searchParams.get('title');
        if (title) return title;
        const prompt = urlObj.searchParams.get('prompt') || "Estampado";
        return prompt;
    } catch (e) {
        return "Estampado";
    }
}

function formatTitle(slug) {
    return slug.replace(/[_-]/g, ' ')
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
}

function addTypingIndicator() {
    const indicatorDiv = document.createElement("div");
    indicatorDiv.classList.add("message", "bot", "typing");
    indicatorDiv.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    messages.appendChild(indicatorDiv);
    messages.scrollTop = messages.scrollHeight;
    return indicatorDiv;
}

function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

// ===== MODAL DE ZOOM (click en el estampado) =====
if (shirtStampContainer) {
    shirtStampContainer.addEventListener('click', () => {
        if (stampOverlayImg.src && stampOverlayImg.style.display !== 'none') {
            imageModal.classList.add('active');
            imgExpanded.src = stampOverlayImg.src;
        }
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        imageModal.classList.remove('active');
    });
}

// Cerrar visor móvil
if (closeViewerBtn) {
    closeViewerBtn.addEventListener('click', () => {
        if (appContainer) appContainer.classList.remove('viewer-open');
    });
}

// Cerrar visor móvil al enfocar el input (cuando aparece el teclado)
if (input) {
    input.addEventListener('focus', () => {
        if (window.innerWidth <= 800 && appContainer) {
            appContainer.classList.remove('viewer-open');
        }
    });
}

// ===== AUTH & SESSION LOGIC =====
document.addEventListener("DOMContentLoaded", () => {
    let userJson = sessionStorage.getItem("user");

    // Si no hay sesión, crear una de invitado automáticamente
    if (!userJson) {
        const guestUser = {
            id: "guest",
            name: "Invitado",
            picture: "https://ui-avatars.com/api/?name=Invitado&background=a855f7&color=fff"
        };
        sessionStorage.setItem("user", JSON.stringify(guestUser));
        userJson = JSON.stringify(guestUser);
    }

    const user = JSON.parse(userJson);
    const userNameElem = document.getElementById("userName");
    const userPictureElem = document.getElementById("userPicture");
    const logoutTrigger = document.getElementById("logoutTrigger");

    if (userNameElem) userNameElem.innerText = user.name.split(' ')[0];
    if (userPictureElem) userPictureElem.src = user.picture;

    // Si es invitado, cambiar texto de logout a "Volver al Inicio"
    if (user.id === "guest" && logoutTrigger) {
        logoutTrigger.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            Volver al Inicio
        `;
    }

    // Inicializar el selector de camisetas
    initShirtSelector();
});

function logout() {
    sessionStorage.removeItem("user");
    window.location.href = "/";
}

// ===== GESTIÓN DE MODALES (Ajustes, Logout, Invitado) =====
const userProfile = document.getElementById("userProfile");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.querySelector(".close-settings");
const logoutModal = document.getElementById("logoutModal");
const logoutTrigger = document.getElementById("logoutTrigger");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

// Abrir ajustes o modal de invitado
userProfile.addEventListener("click", () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.id === "guest") {
        guestModal.style.display = "flex";
        guestModal.classList.add("active");
    } else {
        settingsModal.style.display = "flex";
        settingsModal.classList.add("active");
    }
});

// Cerrar ajustes
if (closeSettings) {
    closeSettings.addEventListener("click", () => {
        settingsModal.style.display = "none";
        settingsModal.classList.remove("active");
    });
}

// Abrir confirmación de logout desde footer
if (logoutTrigger) {
    logoutTrigger.addEventListener("click", () => {
        logoutModal.style.display = "flex";
        logoutModal.classList.add("active");
    });
}

// Logout desde dentro de ajustes
const modalLogoutBtn = document.getElementById("modalLogoutBtn");
if (modalLogoutBtn) {
    modalLogoutBtn.addEventListener("click", () => {
        settingsModal.style.display = "none";
        settingsModal.classList.remove("active");
        logoutModal.style.display = "flex";
        logoutModal.classList.add("active");
    });
}

// Cerrar confirmación de logout
function closeLogoutModal() {
    logoutModal.style.display = "none";
    logoutModal.classList.remove("active");
}

// Confirmar salida
if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("user");
        window.location.href = "/";
    });
}

// Mensaje para invitados en ajustes
if (sessionStorage.getItem("user") && JSON.parse(sessionStorage.getItem("user")).id === "guest") {
    const modalHint = document.querySelector("#settingsModal .modal-hint");
    if (modalHint) {
        modalHint.innerHTML = "Estás en <strong>Modo Invitado</strong>. Los cambios de cuenta están deshabilitados. <a href='/' style='color: var(--accent-primary)'>Inicia sesión</a> para personalizar tu perfil.";
        const settingsForm = document.getElementById("settingsForm");
        if (settingsForm) {
            settingsForm.style.opacity = "0.5";
            settingsForm.style.pointerEvents = "none";
        }
    }
}

// Control del Modal de Invitado
const guestModal = document.getElementById("guestModal");
const closeGuest = document.querySelector(".close-guest");

function closeGuestModal() {
    guestModal.style.display = "none";
    guestModal.classList.remove("active");
}

if (closeGuest) {
    closeGuest.addEventListener("click", closeGuestModal);
}

// Cerrar modales al hacer clic fuera
window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = "none";
        settingsModal.classList.remove("active");
    }
    if (e.target === logoutModal) {
        logoutModal.style.display = "none";
        logoutModal.classList.remove("active");
    }
    if (e.target === guestModal) {
        guestModal.style.display = "none";
        guestModal.classList.remove("active");
    }
});
