let flagsMap = new Map();

//  STEP 2: Load flags from backend
async function loadFlags() {
    try {
        const res = await fetch('http://localhost:3000/flags');
        const data = await res.json();

        if (!res.ok) {
            console.error('Failed to load flags:', data.error);
            return;
        }

        data.countries.forEach(country => {
            flagsMap.set(country.code.toUpperCase(), country.flag);
        });
    } catch (err) {
        console.error('Error loading flags:', err);
    }
}

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    await loadFlags();
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
                const flagUrl = flagsMap.get(code.slice(0, 2).toUpperCase());

                div.innerHTML = flagUrl
                    ? `<img src="${flagUrl}" alt="flag" style="width:20px; margin-right:5px;"> ${code} - ${name}`
                    : `${code} - ${name}`;
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
            if (res.ok && data.accessToken && data.refreshToken) {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('username', username);
                localStorage.setItem('refreshToken', data.refreshToken);
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

    document.getElementById('logout-btn').addEventListener('click', async () => {
        const accessToken = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');

        await fetch('http://localhost:3000/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ refreshToken })
       });

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

document.addEventListener('DOMContentLoaded', () => {
    // existing initApp() already runs, so just bind this manually
    const historyBtn = document.getElementById('fetch-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', fetchHistoricalRates);
    }
});

async function loadCurrenciesForHistory() {
    const fromInput = document.getElementById('history-from');
    const toInput = document.getElementById('history-to');
    const fromDropdown = document.getElementById('history-from-dropdown');
    const toDropdown = document.getElementById('history-to-dropdown');

    try {
        const response = await fetch('http://localhost:3000/currencies');
        if (!response.ok) throw new Error('Failed to load currencies');

        const { currencies } = await response.json(); // Format: [["USD", "US Dollar"], ...]

        function setupDropdown(inputEl, dropdownEl) {
            inputEl.addEventListener('input', () => {
                const query = inputEl.value.toLowerCase();
                dropdownEl.innerHTML = '';
                dropdownEl.style.display = 'none';

                if (!query) return;

                const filtered = currencies.filter(([code, name]) =>
                    code.toLowerCase().includes(query) ||
                    name.toLowerCase().includes(query)
                );

                if (filtered.length) dropdownEl.style.display = 'block';

                filtered.forEach(([code, name]) => {
                    const div = document.createElement('div');
                    const flagUrl = flagsMap.get(code.slice(0, 2).toUpperCase());

                    div.innerHTML = flagUrl
                        ? `<img src="${flagUrl}" alt="flag" style="width:20px; margin-right:5px;"> ${code} - ${name}`
                        : `${code} - ${name}`;
                        div.onclick = () => {
                        inputEl.value = code;
                        dropdownEl.style.display = 'none';
                    };
                    dropdownEl.appendChild(div);
                });
            });
        }

        setupDropdown(fromInput, fromDropdown);
        setupDropdown(toInput, toDropdown);

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.currency-dropdown')) {
                fromDropdown.style.display = 'none';
                toDropdown.style.display = 'none';
            }
        });
    } catch (err) {
        console.error('Error loading currency dropdowns for history:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCurrenciesForHistory();
});

async function fetchHistoricalRates() {
    const from = document.getElementById('history-from').value.trim().toUpperCase();
    const to = document.getElementById('history-to').value.trim().toUpperCase();
    const start = document.getElementById('history-start').value;
    const end = document.getElementById('history-end').value;
    const resultList = document.getElementById('history-results');

    if (!from || !to || !start || !end) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const url = `http://localhost:3000/history?from=${from}&to=${to}&start=${start}&end=${end}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Failed to fetch history.');
            return;
        }

        resultList.innerHTML = '';
        for (const [date, rates] of Object.entries(data.rates)) {
            const li = document.createElement('li');
            li.textContent = `${date}: ${rates[to]}`;
            resultList.appendChild(li);
        }
    } catch (err) {
        console.error('History fetch failed:', err);
        resultList.innerHTML = '<li>Error loading data</li>';
    }
}