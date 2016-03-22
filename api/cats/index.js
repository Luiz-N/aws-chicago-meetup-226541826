
var AWS = require('aws-sdk');
var async = require('async');

var dynamoParams = {
    apiVersion: '2012-08-10',
    maxRetries: 5,
    httpOptions: {
        timeout: 5000
    }
};

if (process.env.AWS_DDB_ENDPOINT) {
     dynamoParams.endpoint = process.env.AWS_DDB_ENDPOINT;
}
var ddbService = new AWS.DynamoDB(dynamoParams);
var docParams = {
    service: ddbService
};

var dynamo = new AWS.DynamoDB.DocumentClient(docParams);

exports.handler = function(event, context) {
    if (process.env.VERBOSE) {
        console.log('Received event:', JSON.stringify(event, null, 2));
    }
    
    var operation = event.operation;
    delete event.operation;

    switch (operation) {
        case 'create':
            dynamo.put(event, context.callbackFunction);
            break;
        case 'get':
            dynamo.get(event, context.callbackFunction);
            break;
        case 'update':
            dynamo.put(event, context.callbackFunction);
            break;
        case 'updateAll':
            var items = [];
            dynamo.scan(event, function(err, result) {
                items = result.Items;
                async.each(items, function (item, done) {
                    var params = {
                        TableName: 'cats',
                        Item: {
                            name: item.name,
                            status: 'fed'
                        }
                    };
                    dynamo.put(params, done);
                }, function(err) {
                    context.callbackFunction(err);
                });
            });
            break;
        case 'delete':
            dynamo.delete(event, context.callbackFunction);
            break;
        case 'show':
            dynamo.scan(event, context.callbackFunction);
            break;
        case 'echo':
            context.succeed(event);
            break;
        case 'ping':
            context.succeed('pong');
            break;
        default:
            context.fail(new Error('Unrecognized operation "' + operation + '"'));
    }
};