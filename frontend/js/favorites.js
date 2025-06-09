document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
});


async function loadFavorites() {
    const token = localStorage.getItem('token');
    console.log("Token in localStorage (favorites.js):", token);

    if (!token) {
        alert("You are not logged in.");
        return;
    }

    const response = await fetch('http://localhost:3000/favorites', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        alert("Fehler beim Laden der Favoriten.");
        return;
    }

    const data = await response.json();
    renderFavorites(data.favorites);
}


async function renderFavorites(favorites) {
    const list = document.getElementById('favorites-list');
    list.innerHTML = '';

    for (const fav of favorites) {
        const rate = await fetchRate(fav.from, fav.to); // Kurs abrufen

        const item = document.createElement('div');
        item.textContent = `${fav.from} ${rate} → ${fav.to}`;

        const updateBtn = document.createElement('button');
        updateBtn.textContent = 'Edit';
        updateBtn.onclick = async () => {
            const newTo = prompt('New Goal (e.g. EUR):');
            if (newTo) {
                await updateFavorite(fav.from, fav.to, fav.from, newTo);
                await loadFavorites();
            }
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = async () => {
            await deleteFavorite(fav.from, fav.to);
            await loadFavorites();
        };

        item.appendChild(updateBtn);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    }
}

async function fetchRate(from, to) {
    try {
        const res = await fetch(`https://api.exchangerate.host/latest?base=${from}&symbols=${to}`);
        const data = await res.json();

        if (!data || !data.rates || !data.rates[to]) {
            console.warn('Rate not found in response:', data);
            return '?';
        }

        return data.rates[to].toFixed(4);
    } catch (err) {
        console.error(`Rate fetch failed for ${from} → ${to}:`, err);
        return '?';
    }
}

async function updateFavorite(from, to, newFrom, newTo) {
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:3000/favorites', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            from,
            to,
            updates: {
                from: newFrom,
                to: newTo
            }
        })
    });

    const data = await response.json();
    console.log(data.message);
}

async function deleteFavorite(from, to) {
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:3000/favorites', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ from, to })
    });

    const data = await response.json();
    console.log(data.message);
}
