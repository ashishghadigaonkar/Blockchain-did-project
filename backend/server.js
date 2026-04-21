require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const { Web3 } = require('web3');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
const path = require('path');
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Debug route to verify file structure on Render
app.get('/debug-files', (req, res) => {
    const fs = require('fs');
    try {
        const files = fs.readdirSync(frontendPath);
        const jsFiles = fs.readdirSync(path.join(frontendPath, 'js'));
        res.json({ frontendPath, files, jsFiles, cwd: process.cwd() });
    } catch (err) {
        res.status(500).json({ error: err.message, frontendPath, cwd: process.cwd() });
    }
});

// Web3 Setup
const web3 = new Web3(process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
const contractAddress = process.env.DID_REGISTRY_ADDRESS;
const abi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "getTrustScore",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
const contract = new web3.eth.Contract(abi, contractAddress);

// Routes

/**
 * @route POST /upload
 * @desc Upload JSON to Pinata (Proxy)
 */
app.post('/upload', async (req, res) => {
    try {
        const data = JSON.stringify(req.body);
        
        const formData = new FormData();
        formData.append('file', Buffer.from(data), {
            filename: 'identity.json',
            contentType: 'application/json',
        });

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxBodyLength: 'Infinity',
            headers: {
                ...formData.getHeaders(),
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
            },
        });

        res.json({
            success: true,
            cid: response.data.IpfsHash,
        });
    } catch (error) {
        console.error('Pinata Upload Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to upload to IPFS', 
            details: error.response?.data?.error || error.message 
        });
    }
});


/**
 * @route GET /identity/:cid
 * @desc Fetch identity JSON from IPFS
 */
app.get('/identity/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
        res.json(response.data);
    } catch (error) {
        console.error('IPFS Fetch Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch from IPFS' });
    }
});

/**
 * @route GET /score/:address
 * @desc Get Trust Score from the smart contract
 */
app.get('/score/:address', async (req, res) => {
    try {
        const { address } = req.params;
        if (!web3.utils.isAddress(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        
        const score = await contract.methods.getTrustScore(address).call();
        res.json({ address, score: Number(score) });
    } catch (error) {
        console.error('Trust Score Fetch Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch trust score' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
