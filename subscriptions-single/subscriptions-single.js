
var paypal = require('paypal-rest-sdk'),
    bodyParser = require('body-parser'),
    http = require('http'),
    app = require('express')();

var clientId = 'YOUR APPLICATION CLIENT ID';
var secret = 'YOUR APPLICATION SECRET';

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': clientId,
  'client_secret': secret
});

app.use(bodyParser.json());

app.get('/createplan', function(req, res){
    var billingPlanAttribs = {
        "name": "Food of the World Club Membership: Standard",
        "description": "Monthly plan for getting the t-shirt of the month.",
        "type": "fixed",
        "payment_definitions": [{
            "name": "Standard Plan",
            "type": "REGULAR",
            "frequency_interval": "1",
            "frequency": "MONTH",
            "cycles": "11",
            "amount": {
                "currency": "USD",
                "value": "19.99"
            }
        }],
        "merchant_preferences": {
            "setup_fee": {
                "currency": "USD",
                "value": "1"
            },
            "cancel_url": "http://localhost:3000/cancel",
            "return_url": "http://localhost:3000/processagreement",
            "max_fail_attempts": "0",
            "auto_bill_amount": "YES",
            "initial_fail_amount_action": "CONTINUE"
        }
    };
    
    var billingPlanUpdateAttributes = [{
        "op": "replace",
        "path": "/",
        "value": {
            "state": "ACTIVE"
        }
    }];

    paypal.billingPlan.create(billingPlanAttribs, function (error, billingPlan){
        if (error){
            console.log(error);
            throw error;
        } else {
            // Activate the plan by changing status to Active
            paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function(error, response){
                if (error) {
                    console.log(error);
                    throw error;
                } else {
                    res.send('Billing plan created under ID: ' + billingPlan.id);
                }
            });
        }
    });
});

app.get('/createagreement', function(req, res){
    var billingPlan = req.query.plan;
    
    var isoDate = new Date();
    isoDate.setSeconds(isoDate.getSeconds() + 4);
    isoDate.toISOString().slice(0, 19) + 'Z';

    var billingAgreementAttributes = {
        "name": "Standard Membership",
        "description": "Food of the World Club Standard Membership",
        "start_date": isoDate,
        "plan": {
            "id": billingPlan
        },
        "payer": {
            "payment_method": "paypal"
        },
        "shipping_address": {
            "line1": "W 34th St",
            "city": "New York",
            "state": "NY",
            "postal_code": "10001",
            "country_code": "US"
        }
    };

    // Use activated billing plan to create agreement
    paypal.billingAgreement.create(billingAgreementAttributes, function (error, billingAgreement){
        if (error) {
            console.error(error);
            throw error;
        } else {
            //capture HATEOAS links
            var links = {};
            billingAgreement.links.forEach(function(linkObj){
                links[linkObj.rel] = {
                    'href': linkObj.href,
                    'method': linkObj.method
                };
            })

            //if redirect url present, redirect user
            if (links.hasOwnProperty('approval_url')){
                res.redirect(links['approval_url'].href);
            } else {
                console.error('no redirect URI present');
            }
        }
    });
});

app.get('/processagreement', function(req, res){
    var token = req.query.token;
    
    paypal.billingAgreement.execute(token, {}, function (error, billingAgreement) {
        if (error) {
            console.error(error);
            throw error;
        } else {
            console.log(JSON.stringify(billingAgreement));
            res.send('Billing Agreement Created Successfully');
        }
    });
});

//create server
http.createServer(app).listen(3000, function () {
   console.log('Server started: Listening on port 3000');
});
