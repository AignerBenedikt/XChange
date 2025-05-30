document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    updateAuthUI();
    bindAuthEvents();
    bindSwapEvent();
    await loadCurrencies();
}

async function loadCurrencies() {
    const fromCurrencyInput = document.getElementById('from-currency');
    const toCurrencyInput = document.getElementById('to-currency');
    const fromCurrencyDropdown = document.getElementById('from-currency-dropdown');
    const toCurrencyDropdown = document.getElementById('to-currency-dropdown');

    try {
        const token = localStorage.getItem('token');
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
                const token = localStorage.getItem('token');
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


function bindAuthEvents() {
    document.getElementById('login-btn').addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('http://localhost:3000/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', username);
                updateAuthUI();
                await loadCurrencies();
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Login request failed');
        }
    });

    document.getElementById('register-btn').addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('http://localhost:3000/register', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            if (res.ok) {
                alert('Registration successful! You can now log in.');
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Register error:', err);
            alert('Registration request failed');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        updateAuthUI();
        location.reload();
    });
}

function updateAuthUI() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const loginSection = document.getElementById('login-section');
    const userInfo = document.getElementById('user-info');
    const welcomeUser = document.getElementById('welcome-user');

    if (token) {
        loginSection.style.display = 'none';
        userInfo.style.display = 'block';
        if (welcomeUser) welcomeUser.textContent = username || 'User';
    } else {
        loginSection.style.display = 'block';
        userInfo.style.display = 'none';
    }
}
