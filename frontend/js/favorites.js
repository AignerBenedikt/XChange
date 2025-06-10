// API Base URL - anpassen falls nötig
const API_BASE_URL = 'http://localhost:3000';

// DOM Elements (initialisiert, wenn das Skript läuft)
let loginForm, registerForm, logoutBtn, refreshTokenBtn, addFavoriteForm, favoritesTable;

// State
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
let currentUser = null;

// Initialisiere die App
document.addEventListener('DOMContentLoaded', () => {
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    logoutBtn = document.getElementById('logoutBtn');
    refreshTokenBtn = document.getElementById('refreshTokenBtn');
    addFavoriteForm = document.getElementById('addFavoriteForm');
    favoritesTable = document.querySelector('#favoritesTable tbody');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (refreshTokenBtn) refreshTokenBtn.addEventListener('click', handleRefreshToken);
    if (addFavoriteForm) addFavoriteForm.addEventListener('submit', handleAddFavorite);

    checkAuthStatus();
});


// Functions
function checkAuthStatus() {
    if (accessToken) {
        document.body.classList.add('logged-in');
        if (document.body.classList.contains('logged-in')) {
            setupFavoriteFormDropdowns();
            loadFavorites(); // Lade Favoriten, wenn angemeldet
        }
    } else {
        document.body.classList.remove('logged-in');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            accessToken = data.accessToken;
            refreshToken = data.refreshToken;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            currentUser = username;

            showMessage('loginMessage', 'Erfolgreich eingeloggt', 'success');
            checkAuthStatus();
        } else {
            showMessage('loginMessage', data.error || 'Login fehlgeschlagen', 'error');
        }
    } catch (error) {
        showMessage('loginMessage', 'Fehler beim Login: ' + error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('registerMessage', 'Erfolgreich registriert. Sie können sich jetzt einloggen.', 'success');
            registerForm.reset();
        } else {
            showMessage('registerMessage', data.error || 'Registrierung fehlgeschlagen', 'error');
        }
    } catch (error) {
        showMessage('registerMessage', 'Fehler bei der Registrierung: ' + error.message, 'error');
    }
}

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (response.ok) {
            accessToken = null;
            refreshToken = null;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            currentUser = null;

            showMessage('authMessage', 'Erfolgreich ausgeloggt', 'success');
            checkAuthStatus();
            location.reload();
        } else {
            const data = await response.json();
            showMessage('authMessage', data.error || 'Logout fehlgeschlagen', 'error');
        }
    } catch (error) {
        showMessage('authMessage', 'Fehler beim Logout: ' + error.message, 'error');
    }
}

async function handleRefreshToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (response.ok) {
            accessToken = data.accessToken;
            localStorage.setItem('accessToken', accessToken);
            showMessage('authMessage', 'Token erfolgreich aktualisiert', 'success');
        } else {
            showMessage('authMessage', data.error || 'Token-Aktualisierung fehlgeschlagen', 'error');
        }
    } catch (error) {
        showMessage('authMessage', 'Fehler bei der Token-Aktualisierung: ' + error.message, 'error');
    }
}

async function loadFavorites() {
    try {
        const response = await fetch(`${API_BASE_URL}/favorites`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Lese den Response-Body EINMAL, egal ob ok oder nicht
        // Wenn der Status nicht OK ist, behandle den Body als Fehler, aber lies ihn trotzdem als JSON, falls möglich
        const data = await response.json(); // Lese den Body HIER EINMAL als JSON

        if (!response.ok) {
            let errorMessage = data.error || 'Ein unbekannter Fehler ist aufgetreten beim Laden der Favoriten.';

            if (response.status === 401 || response.status === 403) {
                showMessage('favoriteMessage', `Authentifizierungsfehler: ${errorMessage}. Bitte melden Sie sich erneut an.`, 'error');
                accessToken = null;
                refreshToken = null;
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                currentUser = null;
                checkAuthStatus();
            } else {
                showMessage('favoriteMessage', `Fehler beim Laden der Favoriten: ${errorMessage}`, 'error');
            }
            return;
        }

        const favorites = data.favorites || [];

        const favoritesWithRates = await Promise.all(
            favorites.map(async fav => {
                try {
                    const rateResponse = await fetch(`${API_BASE_URL}/convert?from=${fav.from}&to=${fav.to}&amount=1`);
                    if (rateResponse.ok) {
                        const rateData = await rateResponse.json();
                        return { ...fav, currentRate: rateData.data.conversion_rate };
                    } else {
                        // Wenn der Rate-Response nicht OK ist, lies den Fehler-Body separat
                        const rateErrorData = await rateResponse.json().catch(() => rateResponse.text());
                        console.error(`Fehler beim Abrufen der Rate für ${fav.from}/${fav.to}:`, rateErrorData);
                        return { ...fav, currentRate: 'N/A' };
                    }
                } catch (rateError) {
                    console.error(`Netzwerkfehler beim Abrufen der Rate für ${fav.from}/${fav.to}:`, rateError);
                    return { ...fav, currentRate: 'N/A' };
                }
            })
        );

        renderFavorites(favoritesWithRates);
    } catch (error) {
        // Dieser Catch-Block fängt Netzwerkfehler oder Fehler beim Parsen des JSON der Haupt-favorites-Anfrage ab.
        showMessage('favoriteMessage', 'Fehler beim Laden der Favoriten: ' + error.message, 'error');
    }
}

async function handleAddFavorite(e) {
    e.preventDefault();
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;

    if (!accessToken) {
        showMessage('favoriteMessage', 'Sie müssen angemeldet sein, um Favoriten hinzuzufügen.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/favorites`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from, to })
        });

        if (!response.ok) {
            let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = await response.text();
                console.warn('Server did not return JSON for error:', errorMessage);
            }

            if (response.status === 401 || response.status === 403) {
                showMessage('favoriteMessage', `Authentifizierungsfehler: ${errorMessage}. Bitte melden Sie sich erneut an.`, 'error');
                accessToken = null;
                refreshToken = null;
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                currentUser = null;
                checkAuthStatus();
            } else {
                showMessage('favoriteMessage', `Fehler beim Hinzufügen des Favoriten: ${errorMessage}`, 'error');
            }
            return;
        }

        const data = await response.json();
        showMessage('favoriteMessage', data.message || 'Favorit erfolgreich hinzugefügt', 'success');
        addFavoriteForm.reset();
        loadFavorites();
    } catch (error) {
        showMessage('favoriteMessage', 'Fehler beim Hinzufügen des Favoriten: ' + error.message, 'error');
    }
}

function renderFavorites(favorites) {
    if (!favoritesTable) return;

    favoritesTable.innerHTML = '';

    if (!favorites || favorites.length === 0) {
        favoritesTable.innerHTML = '<tr><td colspan="4">Keine Favoriten vorhanden</td></tr>';
        return;
    }

    favorites.forEach(fav => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fav.from}</td>
            <td>${fav.to}</td>
            <td>${fav.currentRate !== undefined ? fav.currentRate.toFixed(4) : 'N/A'}</td>
            <td>
                <button class="update-btn" data-from="${fav.from}" data-to="${fav.to}">Aktualisieren</button>
                <button class="delete-btn" data-from="${fav.from}" data-to="${fav.to}">Löschen</button>
            </td>
        `;
        favoritesTable.appendChild(row);
    });

    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', () => handleUpdateFavorite(
            btn.getAttribute('data-from'),
            btn.getAttribute('data-to')
        ));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteFavorite(
            btn.getAttribute('data-from'),
            btn.getAttribute('data-to')
        ));
    });
}

async function handleUpdateFavorite(oldFrom, oldTo) {
    const newFromPrompt = prompt('Neuer "Von"-Wert (leer lassen für keine Änderung):', oldFrom);
    const newToPrompt = prompt('Neuer "Nach"-Wert (leer lassen für keine Änderung):', oldTo);

    // Wenn der Benutzer beide Prompts abbricht (null)
    if (newFromPrompt === null && newToPrompt === null) {
        return;
    }

    // Standardisierung der Eingaben auf Großbuchstaben und Beachtung von leeren Eingaben
    const newFrom = (newFromPrompt !== null && newFromPrompt.trim() !== '') ? newFromPrompt.toUpperCase() : oldFrom.toUpperCase();
    const newTo = (newToPrompt !== null && newToPrompt.trim() !== '') ? newToPrompt.toUpperCase() : oldTo.toUpperCase();

    // Überprüfen, ob sich die Werte tatsächlich geändert haben
    const fromChanged = (newFrom !== oldFrom.toUpperCase());
    const toChanged = (newTo !== oldTo.toUpperCase());

    // Nichts geändert, Abbrechen oder Informieren
    if (!fromChanged && !toChanged) {
        showMessage('favoriteMessage', 'Es wurden keine Änderungen vorgenommen.', 'info');
        return;
    }

    let method;
    const requestBody = {
        oldFrom: oldFrom, // Alte Werte zur Identifizierung des Favoriten
        oldTo: oldTo
    };

    if (fromChanged && toChanged) {
        // Beide Werte geändert -> PUT
        method = 'PUT';
        requestBody.newFrom = newFrom;
        requestBody.newTo = newTo;
    } else {
        method = 'PATCH';
        if (fromChanged) {
            requestBody.newFrom = newFrom;
        }
        if (toChanged) {
            requestBody.newTo = newTo;
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/favorites`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = await response.text();
            }
            if (response.status === 401 || response.status === 403) {
                showMessage('favoriteMessage', `Authentifizierungsfehler: ${errorMessage}. Bitte melden Sie sich erneut an.`, 'error');
                accessToken = null; refreshToken = null;
                localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken');
                currentUser = null; checkAuthStatus();
            } else {
                showMessage('favoriteMessage', `Fehler beim Aktualisieren des Favoriten: ${errorMessage}`, 'error');
            }
            return;
        }

        const data = await response.json();
        showMessage('favoriteMessage', data.message || 'Favorit erfolgreich aktualisiert', 'success');
        loadFavorites(); // Favoriten neu laden, um Änderungen anzuzeigen
    } catch (error) {
        showMessage('favoriteMessage', 'Fehler beim Aktualisieren des Favoriten: ' + error.message, 'error');
    }
}


async function handleDeleteFavorite(from, to) {
    if (!confirm(`Möchten Sie den Favorit von "${from}" nach "${to}" wirklich löschen?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/favorites`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from, to })
        });

        if (!response.ok) {
            let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                errorMessage = await response.text();
            }
            if (response.status === 401 || response.status === 403) {
                showMessage('favoriteMessage', `Authentifizierungsfehler: ${errorMessage}. Bitte melden Sie sich erneut an.`, 'error');
                accessToken = null;refreshToken = null;
                localStorage.removeItem('accessToken');localStorage.removeItem('refreshToken');
                currentUser = null;checkAuthStatus();
            } else {
                showMessage('favoriteMessage', `Fehler beim Löschen des Favoriten: ${errorMessage}`, 'error');
            }
            return;
        }

        const data = await response.json();
        showMessage('favoriteMessage', data.message || 'Favorit erfolgreich gelöscht', 'success');
        loadFavorites();
    } catch (error) {
        showMessage('favoriteMessage', 'Fehler beim Löschen des Favoriten: ' + error.message, 'error');
    }
}

window.showMessage = function(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Message element with ID "${elementId}" not found.`);
        return;
    }
    element.textContent = message;
    element.className = type;

    setTimeout(() => {
        element.textContent = '';
        element.className = 'message';
    }, 5000);
}

async function setupFavoriteFormDropdowns() {
    const addFromInput = document.getElementById('from');
    const addToInput = document.getElementById('to');

    const addFromDropdown = document.createElement('div');
    addFromDropdown.id = 'add-from-dropdown';
    addFromDropdown.className = 'dropdown';
    const addToDropdown = document.createElement('div');
    addToDropdown.id = 'add-to-dropdown';
    addToDropdown.className = 'dropdown';

    if (addFromInput) {
        addFromInput.parentNode.insertBefore(addFromDropdown, addFromInput.nextSibling);
    }
    if (addToInput) {
        addToInput.parentNode.insertBefore(addToDropdown, addToInput.nextSibling);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/currencies`);
        if (!response.ok) throw new Error('Failed to fetch currencies');

        const { currencies } = await response.json();

        function setupDropdown(input, dropdown) {
            if (!input || !dropdown) return;

            // Sicherstellen, dass das Elternelement relative Position hat, um Dropdown richtig zu positionieren
            if (input.parentNode.style.position !== 'relative') {
                input.parentNode.style.position = 'relative';
            }
            dropdown.style.position = 'absolute';
            dropdown.style.width = input.offsetWidth + 'px';
            dropdown.style.top = input.offsetHeight + 'px';
            dropdown.style.left = '0';


            input.addEventListener('input', () => {
                const query = input.value.toLowerCase();
                dropdown.innerHTML = '';
                dropdown.style.display = 'none';

                if (!query) return;

                const filtered = currencies.filter(([code, name]) =>
                    code.toLowerCase().includes(query) ||
                    name.toLowerCase().includes(query)
                );

                const displayLimit = 10;
                if (filtered.length) dropdown.style.display = 'block';

                filtered.slice(0, displayLimit).forEach(([code, name]) => {
                    const div = document.createElement('div');
                    div.textContent = `${code} - ${name}`;
                    div.onclick = (e) => {
                        e.preventDefault();
                        input.value = code;
                        dropdown.style.display = 'none';
                    };
                    dropdown.appendChild(div);
                });
            });

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    const code = input.value.trim().toUpperCase();
                    const isValid = currencies.some(([currCode]) => currCode === code);
                    if (!isValid && input.value !== '') {
                        showMessage(input.id + 'Message', 'Ungültige Währung: ' + input.value, 'error');
                    } else if (typeof showMessage === 'function') {
                        showMessage(input.id + 'Message', '', 'message');
                    }
                }, 200);
            });
        }

        setupDropdown(addFromInput, addFromDropdown);
        setupDropdown(addToInput, addToDropdown);

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.currency-dropdown-wrapper')) {
                if (addFromDropdown) addFromDropdown.style.display = 'none';
                if (addToDropdown) addToDropdown.style.display = 'none';
            }
        });
    } catch (err) {
        console.error('Dropdown setup failed for favorites forms:', err);
        if (typeof showMessage === 'function') {
            showMessage('favoriteMessage', 'Fehler beim Laden der Währungsdaten für Dropdowns.', 'error');
        }
    }
}
