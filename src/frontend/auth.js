/* AUTH LOGIC - FIREBASE DESIGNU */

// Inicializar Firebase
firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();

function handleAuthAction(action) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMessage = document.getElementById('authMessage');

    if (!email || !password) {
        showMessage("Por favor, completa todos los campos.", "error");
        return;
    }

    if (action === 'register') {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                showMessage("Cuenta creada con éxito. Redirigiendo...", "success");
                saveSessionAndRedirect(user);
            })
            .catch((error) => showMessage(translateError(error.code), "error"));
    } else {
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                showMessage("Ingreso exitoso. ¡Bienvenido!", "success");
                saveSessionAndRedirect(user);
            })
            .catch((error) => showMessage(translateError(error.code), "error"));
    }
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            saveSessionAndRedirect(user);
        })
        .catch((error) => showMessage("Error con Google: " + error.message, "error"));
}

function saveSessionAndRedirect(user) {
    sessionStorage.setItem("user", JSON.stringify({
        id: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        picture: user.photoURL || "https://ui-avatars.com/api/?name=" + (user.displayName || user.email)
    }));

    setTimeout(() => {
        window.location.href = "/atelier";
    }, 1200);
}

function showMessage(msg, type) {
    const elem = document.getElementById('authMessage');
    elem.innerText = msg;
    elem.style.color = type === "success" ? "#4ade80" : "#fb7185";
}

function translateError(code) {
    switch(code) {
        case 'auth/email-already-in-use': return 'Este correo ya está registrado.';
        case 'auth/weak-password': return 'La contraseña es muy débil (mín. 6 carc).';
        case 'auth/user-not-found': return 'Usuario no encontrado.';
        case 'auth/wrong-password': return 'Contraseña incorrecta.';
        default: return 'Error en la autenticación: ' + code;
    }
}
// ACTUALIZACIÓN DE CUENTA (SETTINGS)
function handleUpdateAccount() {
    const user = auth.currentUser;
    const currentPass = document.getElementById("currentPassword").value;
    const newEmail = document.getElementById("newEmail").value;
    const confirmEmail = document.getElementById("confirmEmail").value;
    const newPass = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    if (!user) return;
    if (!currentPass) {
        setSettingsMsg("Ingresa tu contraseña actual por seguridad.", "error");
        return;
    }

    // Validaciones de coincidencia
    if (newEmail && newEmail !== confirmEmail) {
        setSettingsMsg("Los campos de correo nuevo no coinciden.", "error");
        return;
    }
    if (newPass && newPass !== confirmPass) {
        setSettingsMsg("Los campos de contraseña nueva no coinciden.", "error");
        return;
    }

    // Re-autenticación obligatoria
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
    
    user.reauthenticateWithCredential(credential)
        .then(() => {
            const promises = [];
            
            if (newEmail && newEmail !== user.email) {
                promises.push(user.updateEmail(newEmail));
            }
            if (newPass) {
                promises.push(user.updatePassword(newPass));
            }

            if (promises.length === 0) {
                setSettingsMsg("No hay cambios suministrados para realizar.", "info");
                return;
            }

            return Promise.all(promises);
        })
        .then(() => {
            setSettingsMsg("¡Datos suministrados y actualizados! Reiniciando...", "success");
            setTimeout(() => location.reload(), 2000);
        })
        .catch((error) => {
            setSettingsMsg(translateError(error.code), "error");
        });
}

function setSettingsMsg(msg, type) {
    const elem = document.getElementById("settingsMessage");
    elem.innerText = msg;
    elem.style.color = type === "success" ? "#4ade80" : (type === "info" ? "#60a5fa" : "#fb7185");
}
