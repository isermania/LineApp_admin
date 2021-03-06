var APIServices = require('./controller');

module.exports = function (app, passport) {
    app.get('/mobileAPI/login',APIServices.login);
    app.get('/mobileAPI/retrieveList',APIServices.retrieveList);
    app.post('/mobileAPI/attemptLineAccess',APIServices.attemptLineAccess);
    app.get('/mobileAPI/retrieveRecipientActions',APIServices.retrieveRecipientActions);
    app.post('/mobileAPI/saveRecord',APIServices.saveRecord);
    app.post('/mobileAPI/saveRecipient',APIServices.saveRecipient);
}