const js2xmlparser = require("js2xmlparser");

function respond(req, res, data, statusCode = 200) {
    const acceptHeader = req.headers['accept'];
    if (acceptHeader && acceptHeader.includes('application/xml')) {
        res.type('application/xml').status(statusCode).send(js2xmlparser.parse("response", data));
    } else {
        res.status(statusCode).json(data);
    }
}

module.exports = respond;
