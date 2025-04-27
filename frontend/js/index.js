document.addEventListener('DOMContentLoaded', async () => {
    const fromCurrencyInput = document.getElementById('from-currency');
    const toCurrencyInput = document.getElementById('to-currency');
    const fromCurrencyDropdown = document.getElementById('from-currency-dropdown');
    const toCurrencyDropdown = document.getElementById('to-currency-dropdown');

    try {
        const response = await fetch('http://localhost:3000/currencies');
        const data = await response.json();

        const currencies = data.currencies;

        // Funktion, die das Dropdown anzeigt
        function showDropdown(inputElement, dropdownElement, currencies) {
            dropdownElement.innerHTML = '';  // Leert das Dropdown, bevor es neue Elemente hinzufügt
            dropdownElement.style.display = 'none'; // Versteckt das Dropdown, wenn keine Eingabe vorhanden ist

            const filterValue = inputElement.value.toLowerCase();

            // Wenn der Filter leer ist, das Dropdown nicht anzeigen
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

        // Event-Listener für die Eingabefelder
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

    } catch (error) {
        console.error('Failed to load currencies:', error);
    }
});
