const { WebpayPlus } = require('transbank-sdk');
const {
  Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes,
} = require('transbank-sdk'); // ES6 Modules
const Transaction = require('transbank-sdk/dist/es5/transbank/webpay/webpay_plus/transaction');

let tx;

if (process.env.NODE_ENV === 'production') {
  tx = new WebpayPlus.Transaction(
    new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration),
  );
} else {
  if (!global.__tx__) {
    global.__tx__ = new WebpayPlus.Transaction(
      new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration),
    );
  }
  tx = global.__tx__;
}

module.exports = tx;
