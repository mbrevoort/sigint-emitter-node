// Summary
// =======
// Connects to an AMQP broker (localhost), binds a queue to an exchange (sigint), and subscribes to receive all the messages published
// into the exchange.  Each message is BSON-parsed and printed to the console.
//
// Running
// =======
// 		node listener.js

var util = require('util');
var amqp = require('amqp');
var BSON = require('buffalo')

var config = {
	amqp: {
		host: 'localhost'
	}
}

var queueName = 'listener';
var exchangeName = 'sigint';

var connection = amqp.createConnection({ host: config.amqp.host });

connection.on('ready', function () {
	connection.exchange(exchangeName, {type: 'headers', durable: true}, function(exchange) {
		util.log("Exchange created");

		connection.queue(queueName, {durable: true}, function(queue) {
			queue.bind(exchange, "*");
			queue.subscribe({ ack: true, prefetchCount: 100 }, function(message, headers, deliveryInfo) {
				var parsed = BSON.parse(message.data);
				util.log("EMISSION: " + util.inspect(parsed, true, 10));
				queue.shift();
			});
		});
	});
});