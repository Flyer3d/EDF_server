
const path = require('path');

// import .env variables
require('dotenv-safe').load({
  path: path.join(__dirname, '../../.env')
});

module.exports = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  HTTPSport: process.env.HTTPS_PORT,
  useHTTPS: process.env.USE_HTTPS === 'true',
  secureCertPath: process.env.EDF_SECURE_CERT,
  secureKeyPath: process.env.EDF_SECURE_KEY,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES,
  edf: {
    defaultUser: 'admin',
    defaultPassword: process.env.EDF_DEFAULT_PASSWORD,
    listsPath: '../../lists',
    uri: process.env.EDF_URI,
    widgetModelName: 'WEB_Widget',
    blockModelName: 'WEB_Block',
    layoutModelName: 'WEB_Layout',
    desktopModelName: 'WEB_Desktop'
  },
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
};
