const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { authenticateToken } = require('../middleware/auth');

// Setup multer to store file in memory
const upload = multer({ storage: multer.memoryStorage() });

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const pinataJWT = process.env.PINATA_JWT;
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;

  if (!pinataJWT && (!pinataApiKey || !pinataSecretKey || pinataApiKey === '""')) {
    console.warn('Pinata credentials not configured. Returning mock CID for testing.');
    return res.json({
      success: true,
      cid: 'mock-cid-for-testing',
      gateway_url: 'https://placehold.co/600x400/png?text=Mock+IPFS+Image',
      mocked: true
    });
  }

  try {
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const pinataOptions = JSON.stringify({ cidVersion: 0 });
    formData.append('pinataOptions', pinataOptions);

    const pinataMetadata = JSON.stringify({
      name: `toka-proof-${Date.now()}-${req.file.originalname}`,
    });
    formData.append('pinataMetadata', pinataMetadata);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
    };

    if (pinataJWT && pinataJWT !== '""') {
      headers['Authorization'] = `Bearer ${pinataJWT}`;
    } else {
      headers['pinata_api_key'] = pinataApiKey;
      headers['pinata_secret_api_key'] = pinataSecretKey;
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      { headers }
    );

    res.json({
      success: true,
      cid: response.data.IpfsHash,
      gateway_url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    });
  } catch (error) {
    console.error('Error uploading to Pinata:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to upload to IPFS' });
  }
});

router.get('/:cid', async (req, res) => {
  const { cid } = req.params;

  if (!cid || typeof cid !== 'string') {
    return res.status(400).json({ error: 'Missing CID' });
  }

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await axios.get(`${gateway}${cid}`, {
        responseType: 'arraybuffer',
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(Buffer.from(response.data));
    } catch (error) {
      // Try next gateway
    }
  }

  return res.status(502).json({ error: 'Unable to fetch IPFS content' });
});

module.exports = router;
