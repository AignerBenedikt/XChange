document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    updateAuthUI();
    bindAuthEvents();
    bindSwapEvent();
    //bindFavoriteEvent();
    await loadCurrencies();
}

async function getValidToken() {
    let token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000;
        if (Date.now() > expiry) {
            const refreshToken = localStorage.getItem('refreshToken');
            const res = await fetch('http://localhost:3000/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.accessToken);
                return data.accessToken;
            } else {
                console.error('Refresh failed:', data.error);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                return null;
            }
        }
        return token;
    } catch (err) {
        console.error('Token parse error:', err);
        return null;
    }
}

async function loadCurrencies() {
    const fromCurrencyInput = document.getElementById('from-currency');
    const toCurrencyInput = document.getElementById('to-currency');
    const fromCurrencyDropdown = document.getElementById('from-currency-dropdown');
    const toCurrencyDropdown = document.getElementById('to-currency-dropdown');

    try {
        const token = await getValidToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch('http://localhost:3000/currencies', { headers });
        if (!response.ok) throw new Error('Failed to load currencies: ' + response.status);

        const data = await response.json();
        const currencies = data.currencies;

        function showDropdown(inputElement, dropdownElement, currencies) {
            dropdownElement.innerHTML = '';
            dropdownElement.style.display = 'none';

            const filterValue = inputElement.value.toLowerCase();
            if (filterValue === '') return;

            const filtered = currencies.filter(([code, name]) =>
                code.toLowerCase().includes(filterValue) ||
                name.toLowerCase().includes(filterValue)
            );

            if (filtered.length > 0) {
                dropdownElement.style.display = 'block';
            }

            filtered.forEach(([code, name]) => {
                const div = document.createElement('div');
                div.textContent = `${code} - ${name}`;
                div.onclick = () => {
                    inputElement.value = `${code} - ${name}`;
                    dropdownElement.style.display = 'none';
                };
                dropdownElement.appendChild(div);
            });
        }

        fromCurrencyInput.addEventListener('input', () =>
            showDropdown(fromCurrencyInput, fromCurrencyDropdown, currencies)
        );
        toCurrencyInput.addEventListener('input', () =>
            showDropdown(toCurrencyInput, toCurrencyDropdown, currencies)
        );

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.currency-dropdown')) {
                fromCurrencyDropdown.style.display = 'none';
                toCurrencyDropdown.style.display = 'none';
            }
        });

        document.getElementById('convert-btn').addEventListener('click', async () => {
            const fromCurrency = fromCurrencyInput.value.split(' - ')[0];
            const toCurrency = toCurrencyInput.value.split(' - ')[0];
            const amount = document.getElementById('amount').value;
            const result = document.getElementById('result');

            const params = new URLSearchParams({ from: fromCurrency, to: toCurrency, amount });

            try {
                const token = await getValidToken();
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

                const response = await fetch('http://localhost:3000/convert?' + params.toString(), { headers });
                if (!response.ok) throw new Error('Conversion failed: ' + response.status);

                const resultData = await response.json();
                result.textContent = resultData.data.converted.toFixed(2) + ' ' + toCurrency;
            } catch (err) {
                console.error('Error during conversion:', err);
                result.textContent = 'Error';
            }
        });

    } catch (error) {
        console.error('Currency load error:', error);
    }
}

function bindSwapEvent() {
    const swapIcon = document.querySelector('.swap-icon');
    if (swapIcon) {
        swapIcon.addEventListener('click', () => {
            const fromInput = document.getElementById('from-currency');
            const toInput = document.getElementById('to-currency');

            const temp = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = temp;
        });
    }
}
/* function bindFavoriteEvent() {
    const favoriteBtn = document.getElementById('add-favorite-btn');

    favoriteBtn.addEventListener('click', async () => {
        const fromInput = document.getElementById('from-currency').value;
        const toInput = document.getElementById('to-currency').value;
        const token = await getValidToken();

        if (!token) {
            alert('Please login first');
            return;
        }

        const fromCode = fromInput.split(' - ')[0];
        const toCode = toInput.split(' - ')[0];

        if (!fromCode || !toCode) {
            alert('Bitte gültige Währungen auswählen.');
            return;
        }

        const response = await fetch('http://localhost:3000/favorites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ from: fromCode, to: toCode })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Favorit gespeichert!');
        } else {
            alert(`Fehler: ${data.error || 'Unbekannter Fehler'}`);
        }
    });
}
*/
function bindAuthEvents() {
    const modal = document.getElementById('auth-modal');
    const authTitle = document.getElementById('auth-title');
    const submitAuth = document.getElementById('submit-auth');
    const closeModal = document.getElementById('close-modal');

    // Show login modal
    document.getElementById('open-login').addEventListener('click', () => {
        modal.classList.remove('hidden');
        authTitle.textContent = 'Login';
        submitAuth.textContent = 'Login';
        submitAuth.dataset.mode = 'login';
    });

    // Show register modal
    document.getElementById('open-register').addEventListener('click', () => {
        modal.classList.remove('hidden');
        authTitle.textContent = 'Register';
        submitAuth.textContent = 'Register';
        submitAuth.dataset.mode = 'register';
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Handle login or registration
    submitAuth.addEventListener('click', async () => {
        const username = document.getElementById('modal-username').value;
        const password = document.getElementById('modal-password').value;
        const mode = submitAuth.dataset.mode; // 'login' or 'register'

        try {
            const res = await fetch(`http://localhost:3000/${mode}`, {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('username', username);
                updateAuthUI();
                modal.classList.add('hidden');
                await loadCurrencies();
            } else {
                alert(data.error || `${mode} failed`);
            }
        } catch (err) {
            console.error(`${mode} error:`, err);
            alert(`${mode} request failed`);
        }
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', async () => {
        const accessToken = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');

        try {
            await fetch('http://localhost:3000/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ refreshToken })
            });
        } catch (err) {
            console.warn('Logout request failed (offline or token expired).');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
        updateAuthUI();
        location.reload();
    });
}

function updateAuthUI() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const userInfo = document.getElementById('user-info');
    const authButtons = document.getElementById('auth-buttons');
    const welcomeUser = document.getElementById('welcome-user');

    if (token) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        if (welcomeUser) {
            welcomeUser.textContent = `Welcome, ${username || 'User'}`;
        }
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}


document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('open-login');
  const registerBtn = document.getElementById('open-register');
  const modal = document.getElementById('auth-modal');
  const closeModal = document.getElementById('close-modal');
  const submitAuth = document.getElementById('submit-auth');
  const authTitle = document.getElementById('auth-title');

  loginBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    authTitle.textContent = 'Login';
    submitAuth.textContent = 'Login';
    submitAuth.dataset.mode = 'login';
  });

  registerBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    authTitle.textContent = 'Register';
    submitAuth.textContent = 'Register';
    submitAuth.dataset.mode = 'register';
  });

  closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
});