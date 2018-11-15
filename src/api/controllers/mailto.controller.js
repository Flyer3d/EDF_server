const httpStatus = require('http-status');
const logger = require('../utils/Logger')(module);
const { handler } = require('../middlewares/error');
const nodemailer = require('nodemailer');


exports.mailToSlava = async (req, res) => {
  const { body } = req;
  logger.info('[mailToSlava] With params:');
  logger.info(body);

  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'billing-service@mail.ru',
      pass: 'billing2018'
    }
  });
  const mailOptions = {
    from: 'billing-service@mail.ru', // sender address
    to: 'billing-service@mail.ru', // list of receivers
    subject: body.subject, // Subject line
    text: body.body // plain text body
  };
  logger.debug('[mailToSlava] Sending mail!');
  logger.debug(mailOptions);

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      logger.error('[mailToSlava] Error sending email!');
      logger.error(err.message);
      return handler(err, req, res);
    }
    logger.info('Message sent: %s', info.messageId);
    logger.debug(info);
    return res.status(httpStatus.NO_CONTENT).end();
  });
};
