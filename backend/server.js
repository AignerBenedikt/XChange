const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Welcome message
app.get('/', (req, res) => {
    res.send(' Welcome to the currency converter Xchange. Follow /convert?from=USD&to=EUR&amount=100');
});

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

        // Validate that the API returns success
        if (data.result !== "success") {
            return res.status(500).json({ error: 'Error getting data from the ExchangeRate API' });
        }

        // Answer Xchange
        const customResponse = {
            message: "this is your conversion ",
            data: {
                from: data.base_code,
                to: data.target_code,
                amount: Number(amount),
                converted: data.conversion_result,
                conversion_rate: data.conversion_rate,
                date: data.time_last_update_utc
            }
        };

        res.json(customResponse);
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

        res.json({
            currencies: codes
        });

    } catch (error) {
        console.error("Fail:", error.message);
        res.status(500).json({ error: 'It is not possible to show the currencies ' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is listening on: http://localhost:${PORT}`);
});