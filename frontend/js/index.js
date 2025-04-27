document.addEventListener('DOMContentLoaded', async () => {
    const fromCurrency = document.getElementById('from-currency');
    const toCurrency = document.getElementById('to-currency');

    try {
        const response = await fetch('http://localhost:3000/currencies');
        const data = await response.json();
        console.log(data);

        const currencies = data.currencies;

        currencies.forEach(currency => {
            const code = currency[0];
            const name = currency[1];

            const optionFrom = document.createElement('option');
            optionFrom.value = code;
            optionFrom.textContent = `${code} - ${name}`;
            fromCurrency.appendChild(optionFrom);

            const optionTo = document.createElement('option');
            optionTo.value = code;
            optionTo.textContent = `${code} - ${name}`;
            toCurrency.appendChild(optionTo);
        });

    } catch (error) {
        console.error('Failed to load currencies:', error);
    }
});