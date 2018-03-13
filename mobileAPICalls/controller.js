var crypto = require('crypto');
var mongo = require('mongodb');
var moment = require('moment');

exports.validateLineManager = function(req,res){
    var userName = req.query.userName;
    var password = req.query.password;
    
    dbClient.collection('lineManagers').find({userName:userName}).toArray(function(err,result){
        if (result.length > 0 && validPassword(password, result[0].password)){
            res.json({success:true, lm: result[0], message:""})
        }else{
            res.json({success:false,message:"Invalid Username or Password"})
        }
    })
}
exports.retrieveList = function(req,res){
    var collection = req.query.type;
    dbClient.collection(collection).find({}).limit(20).toArray(function(err,results){
        res.json(results);
    })
}
exports.attemptLineAccess = function(req,res){
    // Add fingerprint validation here
    // if no fingerprint found
        // return res.json({success:false, type: 'credentialsNotFound'})
    var lineID = req.query.lineID;
    var recipientID = req.query.recipientID;
    var accessFrequency = parseInt(req.query.accessFrequency);
    var accessLowerBound = moment().subtract(accessFrequency,'hours').toDate();
    
    // Check user records
    var searchObj = {
        recipientID: recipientID,
        actions: {
            $elemMatch: {
                lineID: lineID,
                date: {
                    $gte: accessLowerBound
                }
            }
        }
    }
    dbClient.collection('recipientActions').find(searchObj).toArray(function(err,result){
        if(result.length > 0){
            var recipient = result[0];
            var accessFault;
            var actions = recipient.actions.sort(function(a,b){return a.date < b.date})
            for(var i = 0; i < recipient.actions.length; i++){
                if(recipient.actions[i].date > accessLowerBound && recipient.actions[i].lineID === lineID)
                    accessFault = recipient.actions[i];
            }
            // Do we want to log when a recipient makes a fault?
            return res.json({success:false, type: 'faultyAccess', accessFault: accessFault})
        }
        dbClient.collection('lines').findOneAndUpdate({ _id: mongo.ObjectID(lineID)},{$inc: {currentCapacity:-1}},{returnOriginal:false},function(err,line){
            dbClient.collection('recipients').find({_id: mongo.ObjectID(recipientID)}).toArray(function(err,recipient){
                // Add Error Checking
                logRecipientAction(recipient[0],line.value,function(actionObj){
                    return res.json({success:true,line:line.value, accessSuccess:actionObj})
                })
            })
        })
    })
}
exports.retrieveRecipientActions = function(req,res){
    var recipientID = req.query.recipientID
    dbClient.collection('recipientActions').find({recipientID:recipientID}).toArray(function(err,result){
        return res.json({success:true,recipientActions:result[0]})
    })
}

function logRecipientAction(recipient,line,callback){
    var actionDate = new Date();
    var query = {recipientID: recipient._id.toString()};
    var sort = {};
    var actionObj = {
        lineID: line._id.toString(),
        date: actionDate,
        resource: line.resource,
        numTaken: 1 // Add family member access here
        // Add more items to track here for each transaction
    }
    var update = {
        $push: {
            actions: actionObj
        },
        $min: { // Only update if the item's date is less than then previously stored date
            "firstAction": actionDate
        },
        $max: { // Only update if the item's date is greater than the previously stored date
            "lastAction": actionDate
        }
    };
    var options = { upsert: true, new: true };
    dbClient.collection('recipientActions').findAndModify(query, sort, update, options,function(err,result){
        return callback(actionObj);
    })
}

exports.saveRecord = function(req,res){
    var record = JSON.parse(req.query.data)
    record.dateCreated = new Date(record.dateCreated)
    var collection = record.type + 's';
    var recordID = mongo.ObjectID(record._id);
    delete record._id;
    dbClient.collection('lines').findOneAndUpdate({ _id: recordID }, { $set: record }, { returnOriginal: false }, function (err, record) {
        res.json({success:true,record:record.value})
    })
}









var md5 = function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
}
var validPassword = function (plainPassword, hashedPass) {
    var salt = hashedPass.substr(0, 10);
    var validHash = salt + md5(plainPassword + salt);
    return (hashedPass === validHash);
}