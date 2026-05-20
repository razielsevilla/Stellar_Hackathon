const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.listen(3333, () => {
  console.log('Scratch Express listening on 3333');
});
