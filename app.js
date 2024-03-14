const express = require('express')
const { auth, requiredScopes } = require('express-oauth2-bearer');

const app = express()
const port = 3000

app.use(auth());

app.get('/public', (req, res) => {
  res.send('Hello World!')
})

app.get('/private', 
    requiredScopes('read:private'),
    (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

