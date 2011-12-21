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
		test.expect(4);

		var msg1 = {t: "blah1"};
		var msg2 = {t: "blah2"};
		var msg3 = {t: "blah3"};

		var exchange = {};
		exchange.published = [];
		exchange.publish = function(rk, msg) {
			exchange.published.push([rk, msg]);
		};

		var ctrl = {};
		var amqp = nodemock.mock("on").takes('ready', function(){}).ctrl(1, ctrl);
		amqp.mock("on").takes('error', function(){});
		amqp.mock("on").takes('close', function(){});
		amqp.mock("exchange").takes("test_exchange", {type: 'fanout', durable: true}, function(){}).calls(2, [exchange]);

		var amqpFactory = nodemock.mock("createConnection").takes({host: 'localhost'}).returns(amqp);

		var emission = new EmissionFactory({style: 'amqp', amqp: {exchange: "test_exchange", host: 'localhost'}}, amqpFactory);

		emission._emit(msg1);
		emission._emit(msg2);
		emission._emit(msg3);

		ctrl.trigger();

		test.equals(exchange.published.length, 3, "exchange.publish() should have been called twice");
		test.equals(exchange.published[0][0], msg1.t, "exchange.published[0]");
		test.equals(exchange.published[1][0], msg2.t, "exchange.published[1]");
		test.equals(exchange.published[2][0], msg3.t, "exchange.published[2]");

		test.done();
	}
};