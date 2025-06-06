document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
});

async function loadFavorites() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You are not logged in. Please log in to see your favorites.");
        return;
    }

    const response = await fetch('http://localhost:3000/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        alert("Error loading favorites. Please try again later.");
        return;
    }

    const data = await response.json();
    renderFavorites(data.favorites);
}

function renderFavorites(favorites) {
    const list = document.getElementById('favorites-list');
    list.innerHTML = '';

    favorites.forEach(fav => {
        const item = document.createElement('div');
        item.textContent = `${fav.from} → ${fav.to}`;

        const updateBtn = document.createElement('button');
        updateBtn.textContent = 'Edit';
        updateBtn.onclick = async () => {
            const newTo = prompt('New Goal (z. B. EUR):');
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
    });
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
