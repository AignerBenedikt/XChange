document.addEventListener('DOMContentLoaded', async () => {
    const fromCurrencyInput = document.getElementById('from-currency');
    const toCurrencyInput = document.getElementById('to-currency');
    const fromCurrencyDropdown = document.getElementById('from-currency-dropdown');
    const toCurrencyDropdown = document.getElementById('to-currency-dropdown');

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/currencies', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const currencies = data.currencies;

        // Funktion, die das Dropdown anzeigt
        function showDropdown(inputElement, dropdownElement, currencies) {
            dropdownElement.innerHTML = '';  // Leert das Dropdown, bevor es neue Elemente hinzufügt
            dropdownElement.style.display = 'none'; // Versteckt das Dropdown, wenn keine Eingabe vorhanden ist

            const filterValue = inputElement.value.toLowerCase();

            if (filterValue === '') return;

            // Gefilterte Währungen
            const filteredCurrencies = currencies.filter(currency => {
                const code = currency[0].toLowerCase();
                const name = currency[1].toLowerCase();
                return code.includes(filterValue) || name.includes(filterValue);
            });

            // Dropdown anzeigen, wenn es gefilterte Ergebnisse gibt
            if (filteredCurrencies.length > 0) {
                dropdownElement.style.display = 'block';
            }

            // Dropdown mit den gefilterten Währungen füllen
            filteredCurrencies.forEach(currency => {
                const code = currency[0];
                const name = currency[1];

                const div = document.createElement('div');
                div.textContent = `${code} - ${name}`;
                div.onclick = () => {
                    inputElement.value = `${code} - ${name}`;
                    dropdownElement.style.display = 'none'; // Versteckt das Dropdown
                };
                dropdownElement.appendChild(div);
            });
        }

        fromCurrencyInput.addEventListener('input', () => {
            showDropdown(fromCurrencyInput, fromCurrencyDropdown, currencies);
        });

        toCurrencyInput.addEventListener('input', () => {
            showDropdown(toCurrencyInput, toCurrencyDropdown, currencies);
        });

        // Event-Listener für das Schließen des Dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.currency-box')) {
                fromCurrencyDropdown.style.display = 'none';
                toCurrencyDropdown.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if(e.target.id === 'convert-btn'){
                const fromCurrency = fromCurrencyInput.value.split(' - ')[0];
                const toCurrency = toCurrencyInput.value.split(' - ')[0];
                const result = document.getElementById('result');
                const amount = document.getElementById('amount').value;

                (async () => {
                    const params = new URLSearchParams({
                        from: fromCurrency,
                        to: toCurrency,
                        amount: amount
                    });
                    const token = localStorage.getItem('token');
                    const response = await fetch('http://localhost:3000/convert?' + params.toString(), {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const resultData = await response.json();
                    result.textContent = resultData.data.converted = resultData.data.converted.toFixed(2) + " " + toCurrency;
                })();
            }
        })




    } catch (error) {
        console.error('Failed to load currencies:', error);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const swapIcon = document.querySelector('.swap-icon');

    if (swapIcon) {
        swapIcon.addEventListener('click', () => {
            const fromCurrencyInput = document.getElementById('from-currency');
            const toCurrencyInput = document.getElementById('to-currency');

            const temp = fromCurrencyInput.value;
            fromCurrencyInput.value = toCurrencyInput.value;
            toCurrencyInput.value = temp;
        });
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        body: JSON.stringify({ username }),
        headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', username); // Save username too
    updateAuthUI(); // Update interface
});

async function callProtectedRoute() {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3000/protected-route', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(data);
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateAuthUI();
    location.reload();
});

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

document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

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
        loadFavorites();
    } else {
        alert(data.error || 'Login failed');
    }
});

document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

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
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateAuthUI();
    location.reload();
});

function updateAuthUI() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const loginSection = document.getElementById('login-section');
    const userInfo = document.getElementById('user-info');
    const welcomeUser = document.getElementById('welcome-user');

    if (token) {
        loginSection.style.display = 'none';
        userInfo.style.display = 'block';
        welcomeUser.textContent = username;
    } else {
        loginSection.style.display = 'block';
        userInfo.style.display = 'none';
    }
}

updateAuthUI(); // Call on page load

