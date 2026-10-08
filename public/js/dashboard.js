const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
const welcomeText = document.getElementById('welcomeText');

if (welcomeText && user.name) {
    welcomeText.textContent = `Hi, ${user.name}`;
}

document.querySelectorAll('.module-card').forEach((card) => {
    card.addEventListener('click', () => {
        const moduleName = card.dataset.module;
        window.location.href = `/toolkit.html?module=${encodeURIComponent(moduleName)}`;
    });
});

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});
