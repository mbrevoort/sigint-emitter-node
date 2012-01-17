var		testCase = require('nodeunit').testCase
	,	nodemock = require("nodemock")
	,	util = require('util')
	,	events = require('events')
	,	BSON = require('buffalo')
	,	EmissionFactory = require('./../lib/emission_factory')
;

module.exports = {
	"init connects ManagedAMQP": function(test) {


		var amqp = nodemock.mock("on").takes('ready', function(){});
		amqp.mock("on").takes('error', function(){});
		amqp.mock("on").takes('close', function(){});
		var amqpFactory = nodemock.mock("createConnection").takes({host: 'localhost'}).returns(amqp);

		new EmissionFactory({style: 'amqp', amqp: {exchange: "test_exchange", host: 'localhost'}}, amqpFactory);

		test.done();
	},

	"no-op mode does not connect ManagedAMQP": function(test) {
		var emission = new EmissionFactory({style: 'noop'}, null);
		emission._emit({t: "blah"});

		test.done();
	},

	"Buffers emissions while not connected": function(test) {
		var amqp = nodemock.mock("on").takes('ready', function(){});
		amqp.mock("on").takes('error', function(){});
		amqp.mock("on").takes('close', function(){});

		var amqpFactory = nodemock.mock("createConnection").takes({host: 'localhost'}).returns(amqp);

		var emission = new EmissionFactory({style: 'amqp', amqp: {exchange: "test_exchange", host: 'localhost'}}, amqpFactory);

		emission._emit();
		emission._emit({t: "blah2"});
		emission._emit({t: "blah3"});

		test.done();
	},

	"Flushes emissions buffer once connected": function(test) {
		test.expect(7);

		var msg1 = {t: "blah1", s: {a: "app"}};
		var msg2 = {t: "blah2", s: {a: "app"}, o: "op1"};
		var msg3 = {t: "blah3", s: {a: "app"}, g: "app2"};

		var exchange = {};
		exchange.published = [];
		exchange.publish = function(rk, msg, options) {
			exchange.published.push([rk, msg, options]);
		};

		var ctrl = {};
		var amqp = nodemock.mock("on").takes('ready', function(){}).ctrl(1, ctrl);
		amqp.mock("on").takes('error', function(){});
		amqp.mock("on").takes('close', function(){});
		amqp.mock("exchange").takes("test_exchange", {type: 'headers', durable: true}, function(){}).calls(2, [exchange]);

		var amqpFactory = nodemock.mock("createConnection").takes({host: 'localhost'}).returns(amqp);

		var emission = new EmissionFactory({style: 'amqp', amqp: {exchange: "test_exchange", host: 'localhost'}}, amqpFactory);

		emission._emit(msg1);
		emission._emit(msg2);
		emission._emit(msg3);

		ctrl.trigger();

		test.equals(exchange.published.length, 3, "exchange.publish() should have been called three times");
		test.equals(exchange.published[0][0], msg1.t, "exchange.published[0]");
		test.equals(exchange.published[1][0], msg2.t, "exchange.published[1]");
		test.equals(exchange.published[2][0], msg3.t, "exchange.published[2]");

		test.equals(exchange.published[0][2].headers['X-SIGINT-SRC'], msg1.s.a, "exchange.published[0] source header");
		test.equals(exchange.published[1][2].headers['X-SIGINT-OP'], msg2.o, "exchange.published[1] operation header");
		test.equals(exchange.published[2][2].headers['X-SIGINT-TRGT'], msg3.g, "exchange.published[2] target header");
	
		test.done();
	},

	"Load balances multiple connections": function(test) {
		test.expect(4);

		var msg1 = {t: "blah1", s: {a: "app"}};
		var msg2 = {t: "blah2", s: {a: "app"}, o: "op1"};
		var msg3 = {t: "blah3", s: {a: "app"}, g: "app2"};

		var exchange1 = {};
		exchange1.published = [];
		exchange1.publish = function(rk, msg, options) {
			exchange1.published.push([rk, msg, options]);
		};

		var exchange2 = {};
		exchange2.published = [];
		exchange2.publish = function(rk, msg, options) {
			exchange2.published.push([rk, msg, options]);
		};

		var ctrl1 = {};
		var amqp1 = nodemock.mock("on").takes('ready', function(){}).ctrl(1, ctrl1);
		amqp1.mock("on").takes('error', function(){});
		amqp1.mock("on").takes('close', function(){});
		amqp1.mock("exchange").takes("test_exchange", {type: 'headers', durable: true}, function(){}).calls(2, [exchange1]);

		var ctrl2 = {};
		var amqp2 = nodemock.mock("on").takes('ready', function(){}).ctrl(1, ctrl2);
		amqp2.mock("on").takes('error', function(){});
		amqp2.mock("on").takes('close', function(){});
		amqp2.mock("exchange").takes("test_exchange", {type: 'headers', durable: true}, function(){}).calls(2, [exchange2]);

		var amqpFactory = nodemock.mock("createConnection").takes({host: 'localhost'}).returns(amqp1);
		amqpFactory.mock("createConnection").takes({host: 'localhost2'}).returns(amqp2);

		var emission = new EmissionFactory({style: 'amqp', amqp: [{exchange: "test_exchange", host: 'localhost'},{exchange: "test_exchange", host: 'localhost2'}]}, amqpFactory);

		ctrl1.trigger();
		ctrl2.trigger();

		emission._emit(msg1);
		emission._emit(msg2);
		emission._emit(msg3);

		//Which exchange is called will be random, so we'll define some parameters around what must happen in order to be considered "load-balanced".
		test.equals(exchange1.published.length + exchange2.published.length, 3, "publish() should have been called on both exchanges for a total of three times");
		test.ok(exchange1.published.length !== exchange2.published.length, "publish() should not have been called on both exchanges the same number of times");
		test.ok(exchange1.published.length > 0 || exchange2.published.length === 3, "exchange1.publish() should have been called at least once or exchange2.publish() called three times");
		test.ok(exchange2.published.length > 0 || exchange1.published.length === 3, "exchange2.publish() should have been called at least once or exchange1.publish() called three times");
		test.done();
	}
};