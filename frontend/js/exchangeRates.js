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

document.addEventListener('DOMContentLoaded', async () => {
    await loadFlagsMap();
    bindCurrencySelectors();
});


async function bindCurrencySelectors() {
    const baseSelector = document.getElementById('base-selector');
    const targetSelector = document.getElementById('target-selector');

    baseSelector.value = 'USD';
    targetSelector.value = 'EUR';

    await setupExchangeRateDropdowns();

    targetSelector.addEventListener('input', updateExchangeResult);
}



async function loadExchangeRates() {
    const topCurrenciesList = document.getElementById('top-currencies-list');
    const baseCurrency = document.getElementById('base-selector').value.trim().toUpperCase();

    try {
        const response = await fetch(`http://localhost:3000/displayRates?base=${baseCurrency}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Wechselkurse');

        const { data } = await response.json();
        const rates = data.conversion_rates;
        const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];

        topCurrenciesList.innerHTML = '';

        popularCurrencies.forEach(code => {
            if (rates[code]) {
                const li = document.createElement('li');
                li.textContent = `${code}: ${rates[code]}`;
                topCurrenciesList.appendChild(li);
            }
        });
    } catch (err) {
        console.error('Error loading exchange rates:', err);
        topCurrenciesList.innerHTML = '<li>Fehler beim Laden</li>';
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
    const base = document.getElementById('base-selector').value;
    const target = document.getElementById('target-selector').value;
    const resultEl = document.getElementById('exchange-result');

    try {
        const response = await fetch(`http://localhost:3000/displayRates?base=${base}`);
        if (!response.ok) throw new Error('Fehler beim Abrufen des Kurses');

        const { data } = await response.json();
        const rate = data.conversion_rates[target];

        if (rate) {
            resultEl.textContent = `1 ${base} = ${rate} ${target}`;
        } else {
            resultEl.textContent = `Kein Kurs verfügbar für ${target}`;
        }
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Wechselkurses:', err);
        resultEl.textContent = 'Fehler beim Laden des Wechselkurses.';
    }
}
//  NEW: Generate conversion link NEW
function setupGenerateLink() {
    const linkBtn = document.getElementById('generate-link-btn');
    const output = document.getElementById('generated-link');

    if (!linkBtn || !output) return;

    linkBtn.addEventListener('click', async () => {
        const from = document.getElementById('base-selector').value;
        const to = document.getElementById('target-selector').value;
        const amount = document.getElementById('amount-input').value;

        try {
            const response = await fetch('http://localhost:3000/favorites/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ from, to, amount }),
            });

            const { link } = await response.json();
            output.textContent = link;
        } catch (err) {
            console.error('Error generating link:', err);
            output.textContent = 'Error creating link';
        }
    });
}
document.getElementById('save-rate-btn').addEventListener('click', async () => {
    const from = document.getElementById('base-selector').value;
    const to = document.getElementById('target-selector').value;
    const rateText = document.getElementById('exchange-result').textContent;

    if (!rateText || rateText === '-') {
        alert("No rate loaded.");
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to save favorites.");
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/favorites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ from, to })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Exchange rate added to your favorites!");
        } else {
            alert(data.error || "Failed to save favorite.");
        }
    } catch (err) {
        console.error("Error saving favorite:", err);
        alert("Something went wrong.");
    }
});
