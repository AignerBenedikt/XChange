const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const refreshTokens = new Set();
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;

//Welcome message
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const path = require('path');
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

const bcrypt = require('bcrypt');
const users = {};

// Endpoint currency converter
app.get('/convert', async (req, res) => {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
        return res.status(400).json({ error: 'Missing parameters: from, to, amount' });
    }

    try {
        const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/pair/${from}/${to}/${amount}`;
        const response = await axios.get(url);
        const data = response.data;

        if (data.result !== "success") {
            return res.status(500).json({ error: 'Error getting data from the ExchangeRate API' });
        }

        res.json({
            message: "this is your conversion",
            data: {
                from: data.base_code,
                to: data.target_code,
                amount: Number(amount),
                converted: data.conversion_result,
                conversion_rate: data.conversion_rate,
                date: data.time_last_update_utc
            }
        });
    } catch (error) {
        console.error("Error in the API request:", error.message);
        res.status(500).json({ error: 'Internal error in getting the exchange rate' });
    }
});


// Endpoint to obtain available currencies
app.get('/currencies', async (req, res) => {
    const { code, name } = req.query;

    try {
        const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/codes`;
        const response = await axios.get(url);
        const codes = response.data.supported_codes;

        if (code) {
            const result = codes.find(item => item[0].toUpperCase() === code.toUpperCase());
            if (result) {
                return res.json({ message: `🧾 The name of the currency for  ${code}`, name: result[1] });
            } else {
                return res.status(404).json({ error: 'currency code not found' });
            }
        }

        if (name) {
            const result = codes.find(item => item[1].toLowerCase() === name.toLowerCase());
            if (result) {
                return res.json({ message: `the code of the currency for:   "${name}`, code: result[0] });
            } else {
                return res.status(404).json({ error: 'Name not found' });
            }
        }

        res.json({ currencies: codes });
    } catch (error) {
        console.error("Fail:", error.message);
        res.status(500).json({ error: 'It is not possible to show the currencies' });
    }
});

app.get('/displayRates', async (req, res) => {
    const base = req.query.base;
    if (!base) {
        return res.status(400).json({ error: 'Missing base currency' });
    }

    try {
        const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/latest/${base}`;
        const response = await axios.get(url);
        const data = response.data;

        if (data.result !== "success") {
            return res.status(500).json({ error: 'Error getting data from the ExchangeRate API' });
        }

        res.json({
            data: {
                base_currency: data.base_code,
                conversion_rates: data.conversion_rates,
                date: data.time_last_update_utc
            }
        });
    } catch (error) {
        console.error("Error in the API request:", error.message);
        res.status(500).json({ error: 'Internal error in getting the exchange rate' });
    }
});



function authenticateToken(req, res, next) {
    // Middleware to verify token
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
       if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    const accessToken = jwt.sign({ name: username }, SECRET_KEY, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ name: username }, SECRET_KEY, { expiresIn: '7d' });

    refreshTokens.add(refreshToken); // Store refresh token

    res.json({ accessToken, refreshToken });
});

app.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: 'Invalid or missing refresh token' });
    }
    try {
        const payload = jwt.verify(refreshToken, SECRET_KEY);
        const newAccessToken = jwt.sign({ name: payload.name }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(403).json({ error: 'Invalid refresh token' });
       }
});

app.post('/logout', authenticateToken, (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { refreshToken } = req.body;

    tokenBlacklist.add(token);
    if (refreshToken) refreshTokens.delete(refreshToken);

    res.json({ message: 'Logged out successfully' });
});


app.get('/protected-route', authenticateToken, (req, res) => {
    res.json({message: 'Hello, ${req.user.name}! You have accessed a protected route.'});
});

app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    if (users[username]) {
        return res.status(400).json({error: 'User already exists'});
    }

    const passwordHash = await bcrypt.hash(password, 10);
    users[username] = {passwordHash, favorites: []};
    res.json({message: 'User registered successfully'});
});

app.get('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const user = users[username];
    res.json({favorites: user.favorites});
});

app.post('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const {from, to} = req.body;
    const user = users[username];

    const exists = user.favorites.find(fav => fav.from === from && fav.to === to);
    if (!exists) user.favorites.push({from, to});

    res.json({message: 'Favorite saved', favorites: user.favorites});
});

app.put('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const { oldFrom, oldTo, newFrom, newTo } = req.body;
    const user = users[username];

    const fav = user.favorites.find(f => f.from === oldFrom && f.to === oldTo);
    if (fav) {
        fav.from = newFrom;
        fav.to = newTo;
        return res.json({ message: 'Favorite updated', favorites: user.favorites });
    }

    res.status(404).json({ error: 'Favorite not found' });
});

app.delete('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const { from, to } = req.body;
    const user = users[username];

    const beforeLength = user.favorites.length;
    user.favorites = user.favorites.filter(f => !(f.from === from && f.to === to));
    const afterLength = user.favorites.length;

    if (beforeLength === afterLength) {
        return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Favorite deleted', favorites: user.favorites });
});

app.listen(PORT, () => {
    console.log(`Server is listening on: http://localhost:${PORT}`);
});