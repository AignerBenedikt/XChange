const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcrypt');
const respond = require('./utils/respond');
const refreshTokens = new Set();
require('dotenv').config();
//Swagger 
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
//

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;

//Welcome message
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Xchange API',
      version: '1.0.0',
      description: 'API for currency conversion and user management ',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
 },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
////
// Swagger endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
///

const users = {};

// Swagger convert
/**
 * @swagger
 * /convert:
 *   get:
 *     summary: Convierte una cantidad de una moneda a otra
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: "Código de moneda origen (ej: USD)"
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: "Código de moneda destino (ej: EUR)"
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: "Cantidad a convertir"
 *     responses:
 *       200:
 *         description: "Conversión exitosa"
 *       400:
 *         description: "Parámetros faltantes"
 *       500:
 *         description: "Error interno"
 */

// Endpoint currency converter
app.get('/convert', async (req, res) => {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
        return respond(req, res.status(400), { error: 'Missing parameters: from, to, amount' });
    }

    try {
        const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/pair/${from}/${to}/${amount}`;
        const response = await axios.get(url);
        const data = response.data;

        if (data.result !== "success") {
            return respond(req, res.status(500), { error: 'Error getting data from the ExchangeRate API' });
        }

        respond(req, res, {
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
        respond(req, res.status(500), { error: 'Internal error in getting the exchange rate' });
    }
});

//swagger currencies
/**
 * @swagger
 * /convert:
 *   get:
 *     summary: Convert an amount from one currency to another
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: Currency code to convert from (e.g., USD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: Currency code to convert to (e.g., EUR)
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Amount to convert
 *     responses:
 *       200:
 *         description: Conversion successful
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Server error
 */

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
                return respond(req, res, { message: `🧾 The name of the currency for  ${code}`, name: result[1] });
            } else {
                return respond(req, res.status(404), { error: 'currency code not found' });
            }
        }

        if (name) {
            const result = codes.find(item => item[1].toLowerCase() === name.toLowerCase());
            if (result) {
                return respond(req, res,{ message: `the code of the currency for:   "${name}`, code: result[0] });
            } else {
                return respond(req, res.status(404), { error: 'Name not found' });
            }
        }

        respond(req, res, { currencies: codes });
    } catch (error) {
        console.error("Fail:", error.message);
        respond(req, res.status(500), { error: 'It is not possible to show the currencies' });
    }
});

app.get('/displayRates', async (req, res) => {
    const base = req.query.base;
    if (!base) {
        return respond(req, res.status(400), { error: 'Missing base currency' });
    }

    try {
        const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/latest/${base}`;
        const response = await axios.get(url);
        const data = response.data;

        if (data.result !== "success") {
            return respond(req, res.status(500),{ error: 'Error getting data from the ExchangeRate API' });
        }

        respond(req, res,{
            data: {
                base_currency: data.base_code,
                conversion_rates: data.conversion_rates,
                date: data.time_last_update_utc
            }
        });
    } catch (error) {
        console.error("Error in the API request:", error.message);
        respond(req, res.status(500),{ error: 'Internal error in getting the exchange rate' });
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

//swagger login
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login with a user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: User not found
 *       401:
 *         description: Incorrect password
 */
//

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (!user) return respond(req, res.status(400),{ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
       if (!isValid) return respond(req, res.status(401), { error: 'Invalid password' });

    const accessToken = jwt.sign({ name: username }, SECRET_KEY, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ name: username }, SECRET_KEY, { expiresIn: '7d' });

    refreshTokens.add(refreshToken); // Store refresh token

    respond(req, res,{ accessToken, refreshToken });
});

app.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return respond(req, res.status(403),{ error: 'Invalid or missing refresh token' });
    }
    try {
        const payload = jwt.verify(refreshToken, SECRET_KEY);
        const newAccessToken = jwt.sign({ name: payload.name }, SECRET_KEY, { expiresIn: '1h' });
        respond(req, res,{ accessToken: newAccessToken });
    } catch (err) {
        respond(req, res.status(403),{ error: 'Invalid refresh token' });
       }
});

app.post('/logout', authenticateToken, (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { refreshToken } = req.body;

    tokenBlacklist.add(token);
    if (refreshToken) refreshTokens.delete(refreshToken);

    respond(req, res,{ message: 'Logged out successfully' });
});


app.get('/protected-route', authenticateToken, (req, res) => {
    respond(req, res,{message: 'Hello, ${req.user.name}! You have accessed a protected route.'});
});

app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    if (users[username]) {
        return respond(req, res.status(400),{error: 'User already exists'});
    }

    const passwordHash = await bcrypt.hash(password, 10);
    users[username] = {passwordHash, favorites: []};
    respond(req, res,{message: 'User registered successfully'});
});

app.get('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const user = users[username];
    respond(req, res,{favorites: user.favorites});
});

app.post('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const {from, to} = req.body;
    const user = users[username];

    const exists = user.favorites.find(fav => fav.from === from && fav.to === to);
    if (exists) {
        exists.count += 1;
    } else {
        user.favorites.push({ from, to, count: 1});
    }

    respond(req, res,{message: 'Favorite saved', favorites: user.favorites});
});

app.patch('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const { from, to, updates } = req.body;

    const user = users[username];
    const fav = user.favorites.find(f => f.from === from && f.to === to);

    if (!fav) {
        return respond(req, res.status(404), { error: 'Favorite not found' });
    }

    if (updates?.from) fav.from = updates.from;
    if (updates?.to) fav.to = updates.to;
    if (updates?.count) fav.count = updates.count;

    respond(req, res, {
        message: 'Favorite patched successfully',
        favorite: fav,
        favorites: user.favorites
    });
});


app.put('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const { oldFrom, oldTo, newFrom, newTo } = req.body;
    const user = users[username];

    const fav = user.favorites.find(f => f.from === oldFrom && f.to === oldTo);
    if (fav) {
        fav.from = newFrom;
        fav.to = newTo;
        return respond(req, res,{ message: 'Favorite updated', favorites: user.favorites });
    }

    respond(req, res.status(404),{ error: 'Favorite not found' });
});

app.delete('/favorites', authenticateToken, (req, res) => {
    const username = req.user.name;
    const { from, to } = req.body;
    const user = users[username];

    const beforeLength = user.favorites.length;
    user.favorites = user.favorites.filter(f => !(f.from === from && f.to === to));
    const afterLength = user.favorites.length;

    if (beforeLength === afterLength) {
        return respond(req, res.status(404),{ error: 'Favorite not found' });
    }

    respond(req, res,{ message: 'Favorite deleted', favorites: user.favorites });
});

app.get('/favorites/top', authenticateToken, (req, res) => {
    const username = req.user.name;
    const user = users[username];

    const topFavorites = [...user.favorites]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    respond(req, res,{ topFavorites });
});

// NEW Generate dynamic conversion link
app.get('/favorites/link', authenticateToken, (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
        return respond(req, res.status(400),{ error: 'Missing from or to parameters' });
    }

    const link = `http://localhost:${PORT}/convert?from=${from}&to=${to}&amount=1`;

    respond(req, res, {
        message: '🔗 Use this link to view the real-time conversion',
        link
    });
});

app.listen(PORT, () => {
    console.log(`Server is listening on: http://localhost:${PORT}`);
});