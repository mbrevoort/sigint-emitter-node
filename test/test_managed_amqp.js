var		ManagedAmqp = require('./../lib/managed_amqp.js')
	,	testCase = require('nodeunit').testCase
	,	nodemock = require("nodemock")
	,	util = require('util')
	,	events = require('events')
;

function MockAMQP() {}
util.inherits(MockAMQP, events.EventEmitter);

MockAMQP.prototype.exchange = function(name, options, callback)
{
	callback("hello");
};

module.exports = {
	setUp: function(callback) {
		this.readyCtrl = {};
		this.errorCtrl = {};
		this.closeCtrl = {};
		
		this.mockAMQP = new MockAMQP();

		var config = {host: "testHost", exchange: "testExchange"};

		this.mockAMQPFactory = nodemock.mock("createConnection").takes({host: config.host}).returns(this.mockAMQP);
        this.managedAmqp = new ManagedAmqp(this.mockAMQPFactory, config);
		
		callback();		
	},

	"Uses Config": function(test) {
		test.expect(0);
        this.managedAmqp.connect();
        test.done(); //Setup will fail if createConnection() isn't called with {host: "testHost"}
    },

    "Ready is emitted after connecting": function(test) {
		test.expect(1);
		this.managedAmqp.on('ready', function() {
			test.ok(true);
			test.done();
		});

		this.managedAmqp.connect();

		this.mockAMQP.emit('ready');
    },

    "Publish passes through": function(test) {
		test.expect(5);
		var me = this;
		var rk = "blah";
		var ms = "bloop";

    	this.managedAmqp.on('ready', function() {
			test.equal(me.managedAmqp.connected, true, ".connected should be true when ready is fired");

			me.managedAmqp._exchange = { //Override the exchange with a mock one
				publish: function(routingKey, message, options) { 
					test.equals(routingKey, rk, "Routing key");
					test.equals(message, ms, "Message");
					test.deepEqual(options, {headers: {me: true}, deliveryMode: 1, contentType: "text/plain"}, "options");
					test.done();
				}
			};
			me.managedAmqp.publish(rk, ms, {me: true}, "text/plain");
		});

		test.equal(this.managedAmqp.isConnected(), false, ".connected should be false at first");
	    this.managedAmqp.connect();

		this.mockAMQP.emit('ready');
	}
};

