document.addEventListener('DOMContentLoaded', bindCurrencySelectors);

async function bindCurrencySelectors() {
    const baseSelector = document.getElementById('base-selector');
    const targetSelector = document.getElementById('target-selector');

    baseSelector.addEventListener('change', async () => {
        await loadExchangeRates();
        await updateExchangeResult();
    });

    targetSelector.addEventListener('change', updateExchangeResult);

    // Currencies einmalig befüllen
    await populateCurrencySelectors(baseSelector, targetSelector);
}

async function populateCurrencySelectors(baseSelector, targetSelector) {
    try {
        const response = await fetch('http://localhost:3000/displayRates?base=USD');
        if (!response.ok) throw new Error('Konnte Währungen nicht laden');

        const { data } = await response.json();
        const currencies = Object.keys(data.conversion_rates);

        currencies.forEach(code => {
            const baseOption = new Option(code, code);
            const targetOption = new Option(code, code);
            baseSelector.add(baseOption);
            targetSelector.add(targetOption);
        });

        baseSelector.value = 'USD';
        targetSelector.value = 'EUR';

        await loadExchangeRates();
        await updateExchangeResult();
    } catch (err) {
        console.error('Fehler beim Laden der Währungen:', err);
    }
}

async function loadExchangeRates() {
    const topCurrenciesList = document.getElementById('top-currencies-list');
    const baseCurrency = document.getElementById('base-selector').value;

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

async function updateExchangeResult() {
    const base = document.getElementById('base-selector').value;
    const target = document.getElementById('target-selector').value;
    const resultEl = document.getElementById('exchange-result');

    if (base === target) {
        resultEl.textContent = '1:1 – dieselbe Währung.';
        return;
    }

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