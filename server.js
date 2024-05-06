require('dotenv').config();
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const API_CREDENTIALS = {
    username: process.env.API_USER,
    password: process.env.API_PASS
};

let cachedToken = null;
let tokenExpiration = null;

async function authenticate() {
    if (cachedToken && tokenExpiration > new Date()) {
        return cachedToken;
    }
    try {
        const response = await axios.post('https://mafapicrmtest.azurewebsites.net/api/login/authenticate', API_CREDENTIALS);
        cachedToken = `Bearer ${response.data}`;
        tokenExpiration = new Date(new Date().getTime() + 60 * 60 * 1000); // Expires in one hour
        return cachedToken;
    } catch (error) {
        console.error('Error autenticando:', error.response ? error.response.data : error);
        throw new Error('Authentication failed');
    }
}

app.get('/tipoDoc', async (req, res) => {
    try {
        const token = await authenticate(); // Asume que tienes una función para obtener un token de autenticación
        const url = 'https://mafapicrmtest.azurewebsites.net/api/TipoDoc'; // Asegúrate de ajustar la URL según sea necesario
        const response = await axios.get(url, {
            headers: { Authorization: token }
        });

        // Opcionalmente puedes transformar la respuesta antes de enviarla
        res.status(200).send(response.data);
    } catch (error) {
        console.error('Error obteniendo tipos de documento:', error.response ? error.response.data : error);
        res.status(500).send({
            message: 'Error interno del servidor.',
            error: error.response ? error.response.data : error.message
        });
    }
});


app.get('/cliente/:documento', async (req, res) => {
    try {
        const token = await authenticate();
        const response = await axios.get(`https://mafapicrmtest.azurewebsites.net/api/cliente/ObtenerPorDocumento?documento=${req.params.documento}`, {
            headers: { Authorization: token }
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error durante la solicitud:', error.response ? error.response.data : error);
        res.status(500).send({
            message: 'Error interno del servidor.',
            error: error.response ? error.response.data : error.message
        });
    }
});

app.get('/contrato/:documento', async (req, res) => {
    try {
        const token = await authenticate();
        const response = await axios.get(`https://mafapicrmtest.azurewebsites.net/api/contrato/ObtenerPorDocumento?documento=${req.params.documento}`, {
            headers: { Authorization: token }
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error durante la solicitud:', error);
        res.status(500).send({ message: error.message });
    }
});
app.get('/motivo/:tipo', async (req, res) => {
    try {
        const token = await authenticate();
        const response = await axios.get(`https://mafapicrmtest.azurewebsites.net/api/Motivo?Tipo=${req.params.tipo}`, {
            headers: { Authorization: token }
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error obteniendo motivos:', error.response ? error.response.data : error);
        res.status(500).send({
            message: 'Error interno del servidor.',
            error: error.response ? error.response.data : error.message
        });
    }
});
app.get('/submotivo/:tipo/:motivo', async (req, res) => {
    try {
        const token = await authenticate();
        const url = `https://mafapicrmtest.azurewebsites.net/api/SubMotivo?Tipo=${req.params.tipo}&Motivo=${req.params.motivo}`;
        const response = await axios.get(url, {
            headers: { Authorization: token }
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error obteniendo submotivos:', error.response ? error.response.data : error);
        res.status(500).send({
            message: 'Error interno del servidor.',
            error: error.response ? error.response.data : error.message
        });
    }
});

app.post('/adjunto', upload.array('file', 10), async (req, res) => {
    if (!req.files || req.files.length === 0 || !req.body.caseId || !req.body.subject) {
        return res.status(400).send({ message: 'Incomplete data or files not uploaded.' });
    }
    if (req.files.length > 10) {
        return res.status(400).send({ message: 'No puedes subir más de 10 archivos.' });
    }
    try {
        const token = await authenticate();

        // Procesa cada archivo subido
        const promises = req.files.map(file => {
            const fileData = file.buffer.toString('base64');
            const adjuntoData = {
                gEntidad: req.body.caseId,
                Asunto: req.body.subject,
                NombreArchivo: file.originalname,
                Data: fileData
            };

            return axios.post('https://mafapicrmtest.azurewebsites.net/api/adjunto', adjuntoData, {
                headers: {
                    Authorization: token,
                    'Content-Type': 'application/json'
                }
            });
        });

        // Espera a que todos los archivos se hayan procesado
        const responses = await Promise.all(promises);
        res.status(200).send(responses.map(resp => resp.data));
    } catch (error) {
        console.error('Error adjuntando los archivos:', error);
        res.status(500).send({
            message: 'Error interno del servidor.',
            error: error.message
        });
    }
});


app.post('/RegistroForm', async (req, res) => {
    try {
        const token = await authenticate();
        const response = await axios.post('https://mafapicrmtest.azurewebsites.net/api/RegistroForm', req.body, {
            headers: {
                Authorization: token,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).send(response.data);
    } catch (error) {
        console.error('Error durante el registro del caso:', error);
        res.status(500).send({
            message: 'Error interno del servidor.',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
