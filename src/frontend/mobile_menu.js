
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
            
            // Prevenir scroll cuando el menú está abierto
            if (mainNav.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Cerrar menú al hacer click en un enlace
        const navLinks = mainNav.querySelectorAll('a, button');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('active') && !mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});
