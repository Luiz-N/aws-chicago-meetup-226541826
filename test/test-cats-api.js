
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'secret';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-test-1';

var assert = require('assert');
var DdbLocal = require('ddb-local');
var LambdaMock = require('../lambda-mock');


describe('cats', function () {
    var localdb;
    var lambda;
    var api;
    before(function (done) {
        lambda = new LambdaMock();
        localdb = new DdbLocal();
        localdb.start(function (err) {
            assert.ifError(err);
            process.env.AWS_DDB_ENDPOINT = localdb.endpoint;
            api = require('../');
            var catsTable = {
                TableName: 'cats',
                AttributeDefinitions: [
                    {
                        AttributeName: 'name',
                        AttributeType: 'S'
                    }
                ],
                KeySchema: [
                    {
                        AttributeName: 'name',
                        KeyType: 'HASH'
                    }
                ],
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            };
            localdb.client.createTable(catsTable, function (err, result) {
                assert.ifError(err);
                done();
            });
        });
    });
    describe('#createCat', function () {
        it('should create a cat', function (done) {
            var params = {
                operation: 'create',
                TableName: 'cats',
                Item: {
                    name: 'henry',
                    status: 'hungry'
                }
            };
            lambda.invoke(api, 'cats', params, function (err, result) {
                assert.ifError(err);
                params = {
                    operation: 'get',
                    TableName: 'cats',
                    Key: {
                        name: 'henry'
                    }
                };
                lambda.invoke(api, 'cats', params, function (err, result) {
                    assert.ifError(err);
                    assert.equal(result.Item.name, params.Key.name);
                    assert.equal(result.Item.status, 'hungry');
                    done();
                });
            });
        });
    });
    describe('#getCat', function () {
        it('should get a cat by name', function (done) {
            var params = {
                operation: 'get',
                TableName: 'cats',
                Key: {
                    name: 'henry'
                }
            };
            lambda.invoke(api, 'cats', params, function (err, result) {
                assert.ifError(err);
                assert.equal(result.Item.name, params.Key.name);
                assert.equal(result.Item.status, 'hungry');
                done();
            });
        });
    });
    describe('#updateCat', function () {
        it('should update a cat\'s status by name', function (done) {
            var params = {
                operation: 'update',
                TableName: 'cats',
                Item: {
                    name: 'henry',
                    status: 'sleeping'
                }
            };
            lambda.invoke(api, 'cats', params, function (err, result) {
                assert.ifError(err);
                params = {
                    operation: 'get',
                    TableName: 'cats',
                    Key: {
                        name: 'henry'
                    }
                };
                lambda.invoke(api, 'cats', params, function (err, result) {
                    assert.ifError(err);
                    assert.equal(result.Item.name, params.Key.name);
                    assert.equal(result.Item.status, 'sleeping');
                    done();
                });
            });
        });
    });
    describe('#listCats', function () {
        it('should return a list of all cats', function (done) {
            var params = {
                operation: 'show',
                TableName: 'cats'
            };
            lambda.invoke(api, 'cats', params, function (err, result) {
                assert.ifError(err);
                assert.equal(result.Items.length, 1);
                assert.equal(result.Items[0].name, 'henry');
                assert.equal(result.Items[0].status, 'sleeping');
                done();
            });
        });
    });
    describe('#updateFedCats', function () {
        it('should update all cats as fed', function (done) {
            var params = {
                operation: 'updateAll',
                TableName: 'cats',
                Item: {
                    status: 'fed'
                }
            };
            lambda.invoke(api, 'cats', params, function(err) {
                  assert.ifError(err);
                  var params = {
                      operation: 'show',
                      TableName: 'cats'
                  };
                  lambda.invoke(api, 'cats', params, function (err, result) {
                      assert.ifError(err);
                      result.Items.forEach(function(item) {
                          assert.equal(item.status, 'fed');
                      });
                      done();
                  });
              });
          });
    });
    describe('#overlyComplexUpdateNappingCats', function () {
        it('should update all cats as napping', function (done) {
            var params = {
                operation: 'show',
                TableName: 'cats'
            };
            lambda.invoke(api, 'cats', params, function (err, result) {
                assert.ifError(err);
                var cats = result.Items.map(function(item) {
                    var params = {
                        operation  : 'update',
                        TableName  : 'cats',
                        Item: {
                          name   : item.name,
                          status : 'napping'
                        }
                    };
                    return {
                        module       : api,
                        functionName : 'cats',
                        request      : function() {return params;},
                        callback     : function(err, request, result, done) {
                            //This gets called in the context.callbackFunction!!!
                            done(err);
                        }
                    };
                });
                lambda.invokeParallel(cats, function(err, result) {
                    assert.ifError(err);
                    var params = {
                        operation: 'show',
                        TableName: 'cats'
                    };
                    lambda.invoke(api, 'cats', params, function (err, result) {
                        assert.ifError(err);
                        result.Items.forEach(function(item) {
                            assert.equal(item.status, 'napping');
                        });
                        done();
                    });
                });
            });
        });
    });
    after(function (done) {
        localdb.stop(done);
    });
});
