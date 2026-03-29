const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const imageModal = document.getElementById("imageModal");
const imgExpanded = document.getElementById("imgExpanded");
const closeModal = document.querySelector(".close-modal");

// Elementos de la Nueva UI (Atelier)
const mainPreviewContainer = document.getElementById("mainPreviewContainer");
const mainPreviewImg = document.getElementById("mainPreviewImg");
const downloadBtn = document.getElementById("downloadBtn");
const currentDesignTitle = document.getElementById("currentDesignTitle");
const currentDesignSubtitle = document.getElementById("currentDesignSubtitle");
const galleryList = document.getElementById("galleryList");

// Elementos de Navegación
const prevNavBtn = document.getElementById("prevNavBtn");
const nextNavBtn = document.getElementById("nextNavBtn");

// Elementos de Visión (Carga de Imágenes)
const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadBtn");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");
const removeImageBtn = document.getElementById("removeImageBtn");

let selectedFile = null;

let designHistory = []; // Array de objetos { url, title }
let currentIndex = -1;

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Lógica de Visión
uploadBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelection(file);
});

// Pegado desde el Portapapeles
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

async function sendMessage() {
    const text = input.value.trim();
    if (!text && !selectedFile) return;

    // Mostrar mensaje del usuario con imagen si existe
    addMessage(text, "user", selectedFile);
    
    // Preparar FormData
    const formData = new FormData();
    formData.append("text", text || "Analiza esta imagen");
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
        removeTypingIndicator(typingIndicator);
        addMessage(data.reply, "bot");

    } catch (error) {
        console.error("Error:", error);
        removeTypingIndicator(typingIndicator);
        addMessage("Error al conectar con la IA", "bot");
    }
}

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
    
    // Buscar imágenes
    const images = msgDiv.querySelectorAll('img');
    images.forEach(img => {
        const imageUrl = img.src;
        const spanishTitle = getTitleFromUrl(imageUrl);
        
        // Crear contenedor pequeño para el chat
        const container = document.createElement('div');
        container.classList.add('image-container');
        img.parentNode.insertBefore(container, img);
        container.appendChild(img);

        // Al cargar la imagen
        img.onload = () => {
            const index = addToHistory(imageUrl, spanishTitle);
            displayAtIndex(index);
        };

        // Click en la miniatura del chat
        container.addEventListener('click', () => {
            const index = designHistory.findIndex(d => d.url === imageUrl);
            if (index !== -1) displayAtIndex(index);
        });
    });
    
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

function getTitleFromUrl(url) {
    try {
        const urlObj = new URL(url, window.location.origin);
        const title = urlObj.searchParams.get('title');
        if (title) return title;
        
        // Fallback al prompt si no hay título
        const prompt = urlObj.searchParams.get('prompt') || "Diseño de Moda";
        return prompt;
    } catch(e) {
        return "Diseño de Moda";
    }
}

function displayAtIndex(index) {
    if (index < 0 || index >= designHistory.length) return;
    
    currentIndex = index;
    const design = designHistory[currentIndex];

    // Limpiar estado vacío
    mainPreviewContainer.classList.remove('empty');
    const emptyState = mainPreviewContainer.querySelector('.empty-state');
    if (emptyState) emptyState.style.display = 'none';

    // Actualizar Imagen con animación
    mainPreviewImg.style.display = 'none';
    mainPreviewImg.src = design.url;
    
    mainPreviewImg.onload = () => {
        mainPreviewImg.style.display = 'block';
        if (downloadBtn) downloadBtn.style.display = 'flex';
    };

    // Actualizar Textos
    currentDesignTitle.innerText = formatTitle(design.title);
    currentDesignSubtitle.innerText = `Diseño #${designHistory.length - index} del Atelier`;

    updateNavButtons();
}

function addToHistory(url, title) {
    // Si ya existe en el historial, no duplicar pero devolver índice
    const existingIndex = designHistory.findIndex(d => d.url === url);
    if (existingIndex !== -1) return existingIndex;

    // Agregar al inicio del array lógico (más reciente = índice 0)
    const newDesign = { url, title };
    designHistory.unshift(newDesign);

    // Actualizar Galería Visual
    const thumb = document.createElement('div');
    thumb.classList.add('gallery-thumb');
    thumb.innerHTML = `<img src="${url}" alt="${title}">`;
    
    thumb.addEventListener('click', () => {
        const idx = designHistory.findIndex(d => d.url === url);
        displayAtIndex(idx);
    });


    galleryList.insertBefore(thumb, galleryList.firstChild);
    
    return 0; // Siempre es el primero al agregar
}

// AUTH & SESSION LOGIC - ATELIER
document.addEventListener("DOMContentLoaded", () => {
    const userJson = sessionStorage.getItem("user");
    if (!userJson) {
        // Redirigir a landing si no hay sesión
        window.location.href = "/";
        return;
    }

    const user = JSON.parse(userJson);
    const userNameElem = document.getElementById("userName");
    const userPictureElem = document.getElementById("userPicture");
    
    if (userNameElem) userNameElem.innerText = user.name.split(' ')[0];
    if (userPictureElem) userPictureElem.src = user.picture;
});

function logout() {
    sessionStorage.removeItem("user");
    window.location.href = "/";
}

// LÓGICA DE DESCARGA
if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        const imgUrl = mainPreviewImg.src;
        if (!imgUrl || mainPreviewImg.style.display === "none") return;

        // Crear un nombre descriptivo basado en el prompt
        const promptText = input.value || "diseno-designu";
        const filename = `DesignU-${promptText.substring(0, 30).replace(/\s+/g, '-').toLowerCase()}.jpg`;

        // Conversión Profesional a JPG usando Canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.crossOrigin = "anonymous"; // Importante para imágenes externas
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Forzar fondo blanco (por si hay transparencias en la fuente)
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(img, 0, 0);
            
            // Convertir a DataURL como Image/jpeg con calidad 0.92
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
            
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            console.log("Descarga JPG completada:", filename);
        };
        
        img.onerror = () => alert("Error al procesar la imagen para descarga.");
        img.src = imgUrl;
    });
}

function updateNavButtons() {
    // En nuestro array, 0 es el más reciente (DERECHA en UI?) 
    // No, vamos a manejarlo: 
    // Prev es ir a diseños más antiguos (índice mayor)
    // Next es ir a diseños más nuevos (índice menor)
    
    prevNavBtn.disabled = (currentIndex >= designHistory.length - 1);
    nextNavBtn.disabled = (currentIndex <= 0);
}

// Eventos de Navegación
prevNavBtn.addEventListener('click', () => {
    if (currentIndex < designHistory.length - 1) {
        displayAtIndex(currentIndex + 1);
    }
});

nextNavBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        displayAtIndex(currentIndex - 1);
    }
});

function formatTitle(slug) {
    // Reemplaza guiones y guiones bajos por espacios, luego capitaliza cada palabra
    return slug.replace(/[_-]/g, ' ')
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
}

function addTypingIndicator() {
    const indicatorDiv = document.createElement("div");
    indicatorDiv.classList.add("message", "bot", "typing");
    indicatorDiv.innerHTML = `
        <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    messages.appendChild(indicatorDiv);
    messages.scrollTop = messages.scrollHeight;
    return indicatorDiv;
}

function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

// Modal zoom logic
mainPreviewImg.addEventListener('click', () => {
    imageModal.classList.add('active');
    imgExpanded.src = mainPreviewImg.src;
});

closeModal.addEventListener('click', () => {
    imageModal.classList.remove('active');
});

// GESTIÓN DE MODALES - AJUSTES Y LOGOUT
const userProfile = document.getElementById("userProfile");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.querySelector(".close-settings");
const logoutModal = document.getElementById("logoutModal");
const logoutTrigger = document.getElementById("logoutTrigger");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

// Abrir ajustes
userProfile.addEventListener("click", () => {
    settingsModal.style.display = "flex";
    settingsModal.classList.add("active");
});

// Cerrar ajustes
closeSettings.addEventListener("click", () => {
    settingsModal.style.display = "none";
    settingsModal.classList.remove("active");
});

// Abrir confirmación de logout
logoutTrigger.addEventListener("click", () => {
    logoutModal.style.display = "flex";
    logoutModal.classList.add("active");
});

// Cerrar confirmación de logout
function closeLogoutModal() {
    logoutModal.style.display = "none";
    logoutModal.classList.remove("active");
}

// Confirmar salida real
confirmLogoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("user");
    window.location.href = "/";
});

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
});
