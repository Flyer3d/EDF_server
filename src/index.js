// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign
const fs = require('fs');
const https = require('https');
const http = require('http');
const {
  port,
  env,
  HTTPSport,
  useHTTPS,
  secureCertPath,
  secureKeyPath
} = require('./config/vars');
const app = require('./config/express');
const edf = require('./config/EDF');


const startServer = () => {
  console.log(`Starting Servers (${useHTTPS})`);

  http.createServer(app).listen(port, '0.0.0.0', () => console.info(`Server started on port ${port} (${env})`));
  if (useHTTPS) {
    const privateKey = fs.readFileSync(secureKeyPath);
    const certificate = fs.readFileSync(secureCertPath);
    https.createServer({ privateKey, certificate }, app).listen(HTTPSport, '0.0.0.0', () => console.info(`SECURE server started on port ${HTTPSport} (${env})`));
  }
};

edf.init(startServer);
/**
* Exports express
* @public
*/
module.exports = app;
