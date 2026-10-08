const messageElement = document.getElementById('message');

async function request(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
    }

    return data;
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageElement.className = 'message';
        messageElement.textContent = 'Logging in...';

        try {
            const data = await request('/api/auth/login', {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard.html';
        } catch (error) {
            messageElement.className = 'message error';
            messageElement.textContent = error.message;
        }
    });
}

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageElement.className = 'message';
        messageElement.textContent = 'Creating account...';

        try {
            await request('/api/auth/register', {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            });

            messageElement.className = 'message success';
            messageElement.textContent = 'Registration successful. Redirecting to login...';

            setTimeout(() => {
                window.location.href = '/login.html';
            }, 700);
        } catch (error) {
            messageElement.className = 'message error';
            messageElement.textContent = error.message;
        }
    });
}
