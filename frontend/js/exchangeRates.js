// API Base URL - anpassen falls nötig
const API_BASE_URL = 'http://localhost:3000';
let flagsMap = new Map();

async function loadFlagsMap() {
    try {
        const response = await fetch('http://localhost:3000/flags');
        const { countries } = await response.json();

        countries.forEach(({ code, flag }) => {
            flagsMap.set(code.toUpperCase(), flag);
        });
    } catch (err) {
        console.error("Failed to load flags:", err);
    }
}

document.addEventListener('DOMContentLoaded', async() => {
    bindCurrencySelectors();
    await loadFlagsMap();
    // Event listener for the "Add to Favorites" button
    const saveRateBtn = document.getElementById('save-rate-btn');
    if (saveRateBtn) {
        saveRateBtn.addEventListener('click', handleSaveRate);
    }
});

async function bindCurrencySelectors() {
    const baseSelector = document.getElementById('base-selector');
    const targetSelector = document.getElementById('target-selector');

    if (!baseSelector || !targetSelector) return; // Exit if elements not found

    baseSelector.value = 'USD';
    targetSelector.value = 'EUR';

    showTopCurrencyPlaceholders();
    await setupExchangeRateDropdowns();

    targetSelector.addEventListener('input', updateExchangeResult);
    baseSelector.addEventListener('input', updateExchangeResult); // Added for base currency changes

    updateExchangeResult();
    loadExchangeRates();
}

function showTopCurrencyPlaceholders() {
    const topCurrenciesList = document.getElementById('top-currencies-list');
    const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

    topCurrenciesList.innerHTML = '';

    popularCurrencies.forEach(code => {
        const li = document.createElement('li');
        li.textContent = `${code}: -`; // placeholder sin valor
        topCurrenciesList.appendChild(li);
    });
}

async function loadExchangeRates() {
    const topCurrenciesList = document.getElementById('top-currencies-list');
    const baseCurrencyInput = document.getElementById('base-selector');

    if (!topCurrenciesList || !baseCurrencyInput) return;

    const baseCurrency = baseCurrencyInput.value.trim().toUpperCase();

    try {
        const response = await fetch(`${API_BASE_URL}/displayRates?base=${baseCurrency}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Wechselkurse');

        const { data } = await response.json();
        const rates = data.conversion_rates;
        const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

        topCurrenciesList.innerHTML = '';

        popularCurrencies.forEach(code => {
            if (rates[code]) {
                const li = document.createElement('li');
                li.textContent = `${code}: ${rates[code].toFixed(4)}`;
                topCurrenciesList.appendChild(li);
            }
        });
    } catch (err) {
        console.error('Error loading exchange rates:', err);
        if (typeof showMessage === 'function') {
            showMessage('favorite-message', 'Fehler beim Laden der Top-Wechselkurse', 'error');
        } else {
            topCurrenciesList.innerHTML = '<li>Fehler beim Laden der Top-Wechselkurse</li>';
        }
    }
}

async function setupExchangeRateDropdowns() {
    const baseInput = document.getElementById('base-selector');
    const targetInput = document.getElementById('target-selector');
    const baseDropdown = document.getElementById('base-selector-dropdown');
    const targetDropdown = document.getElementById('target-selector-dropdown');


    try {
        const response = await fetch('http://localhost:3000/currencies');
        if (!response.ok) throw new Error('Failed to fetch currencies');

        const { currencies } = await response.json(); // [["USD", "US Dollar"], ...]

        function setupDropdown(input, dropdown) {
            input.addEventListener('input', () => {
                const query = input.value.toLowerCase();
                dropdown.innerHTML = '';
                dropdown.style.display = 'none';

                if (!query) return;

                const filtered = currencies.filter(([code, name]) =>
                    code.toLowerCase().includes(query) ||
                    name.toLowerCase().includes(query)
                );

                if (filtered.length) dropdown.style.display = 'block';

                filtered.forEach(([code, name]) => {
                    const div = document.createElement('div');
                    const flagUrl = flagsMap.get(code.slice(0, 2).toUpperCase());

                    div.innerHTML = flagUrl
                        ? `<img src="${flagUrl}" alt="flag" style="width:20px; margin-right:5px;"> ${code} - ${name}`
                        : `${code} - ${name}`;

                    div.onclick = (e) => {
                        e.preventDefault();
                        input.value = code;
                        dropdown.style.display = 'none';

                        setTimeout(() => {
                            loadExchangeRates();
                            updateExchangeResult();
                        }, 100);
                    };
                    dropdown.appendChild(div);
                });

            });

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    const code = input.value.trim().toUpperCase();
                    const isValid = currencies.some(([currCode]) => currCode === code);

                    if (isValid) {
                        loadExchangeRates();
                        updateExchangeResult();
                    }
                }, 200); // kurze Verzögerung für Dropdown-Klick
            });
        }

        setupDropdown(baseInput, baseDropdown);
        setupDropdown(targetInput, targetDropdown);

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.currency-dropdown')) {
                baseDropdown.style.display = 'none';
                targetDropdown.style.display = 'none';
            }
        });
    } catch (err) {
        console.error('Dropdown setup failed:', err);
    }
}

async function updateExchangeResult() {
    const base = document.getElementById('base-selector')?.value;
    const target = document.getElementById('target-selector')?.value;
    const resultEl = document.getElementById('exchange-result');

    if (!base || !target || !resultEl) {
        if (resultEl) resultEl.textContent = '-';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/displayRates?base=${base}`);
        if (!response.ok) throw new Error('Fehler beim Abrufen des Kurses');

        const { data } = await response.json();
        const rate = data.conversion_rates[target];

        if (rate) {
            resultEl.textContent = `1 ${base} = ${rate.toFixed(6)} ${target}`;
        } else {
            resultEl.textContent = `Kein Kurs verfügbar für ${target}`;
        }
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Wechselkurses:', err);
        if (resultEl) resultEl.textContent = 'Fehler beim Laden des Wechselkurses.';
    }
}

// Function to handle saving the exchange rate as a favorite
async function handleSaveRate() {
    const from = document.getElementById('base-selector')?.value;
    const to = document.getElementById('target-selector')?.value;
    const rateText = document.getElementById('exchange-result')?.textContent;
    const messageElementId = 'favorite-message'; // ID of the message div in exchangeRates.html

    if (!rateText || rateText === '-' || !from || !to) {
        if (typeof showMessage === 'function') {
            showMessage(messageElementId, "Bitte einen gültigen Wechselkurs auswählen.", "error");
        } else {
            alert("Please load a valid exchange rate first.");
        }
        return;
    }

    const token = localStorage.getItem('accessToken'); // Get the stored access token
    if (!token) {
        if (typeof showMessage === 'function') {
            showMessage(messageElementId, "Sie müssen angemeldet sein, um Favoriten zu speichern.", "error");
        } else {
            alert("You must be logged in to save favorites.");
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/favorites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ from, to })
        });

        const data = await res.json();

        if (res.ok) {
            if (typeof showMessage === 'function') {
                showMessage(messageElementId, "Wechselkurs zu Favoriten hinzugefügt!", "success");
            } else {
                alert("Exchange rate added to your favorites!");
            }
            // Optionally, you might want to refresh the favorites list on favorites.html if it's open.
            // This would require a more complex Pub/Sub pattern or similar.
        } else {
            if (typeof showMessage === 'function') {
                showMessage(messageElementId, data.error || "Fehler beim Speichern des Favoriten.", "error");
            } else {
                alert(data.error || "Failed to save favorite.");
            }
        }
    } catch (err) {
        console.error("Error saving favorite:", err);
        if (typeof showMessage === 'function') {
            showMessage(messageElementId, "Ein Fehler ist aufgetreten beim Speichern des Favoriten.", "error");
        } else {
            alert("Something went wrong.");
        }
    }
}
