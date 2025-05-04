document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    bindBaseSelector();
    await loadExchangeRates();
}

function bindBaseSelector() {
    const baseSelector = document.getElementById('base-selector');
    baseSelector.addEventListener('change', loadExchangeRates);
}

async function loadExchangeRates() {
    console.log('Lade Wechselkurse...');
    const topCurrenciesList = document.getElementById('top-currencies-list');
    const baseSelector = document.getElementById('base-selector');
    const baseCurrency = baseSelector.value;

    try {
        const response = await fetch(`http://localhost:3000/displayRates?base=${baseCurrency}`);
        if (!response.ok) throw new Error('Failed to fetch exchange rates');

        const { data } = await response.json();
        const rates = data.conversion_rates;

        const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
        topCurrenciesList.innerHTML = '';

        popularCurrencies.forEach(code => {
            if (rates[code]) {
                const li = document.createElement('li');
                li.textContent = `${rates[code]} ${code}`;
                topCurrenciesList.appendChild(li);
            }
        });
    } catch (err) {
        console.error('Error loading exchange rates:', err);
        topCurrenciesList.innerHTML = '<li>Error loading rates</li>';
    }
}