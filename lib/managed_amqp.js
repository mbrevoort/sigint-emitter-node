var events = require('events');
var util = require('util');

// Summary
// -------
// `ManagedAmqp` is a wrapper around the amqp library that hides all the reconnection logic and fires a `ready` event 
// whenever is a connection is established or reestablished.
//
// `isConnected()` will return `true` when connected, and `false` when not.
//
// Usage
// -----
//
//		var amqp = require('amqp');
//		var config = { host: "localhost" };
//		var ManagedAmqp = require('./lib/managed_amqp');
//		var mAMQP = new ManagedAmqp(amqp, config);
//		mAMQP.on('ready', function() {
//			console.log('AMQP is connected!);
//		});
//		mAMQP.connect();

// Construct a new managed connection.
//
// `amqp` is the injected amqp library.
// `config` is the configuration object to be passed into amqp.
function ManagedAmqp(amqp, config) {
	this._amqp = amqp;
	this._config = config;
	this.connected = false;
	events.EventEmitter.call(this);
	this.closeRequested = false;
}
util.inherits(ManagedAmqp, events.EventEmitter);

// Start the connection and attempt to maintain the connection by reconnecting whenever there is an error.
ManagedAmqp.prototype.connect = function() {
	var self = this;

	this._connection = this._amqp.createConnection(this._config);

	this._connection.on('ready', function() {
		self._connection.exchange(self._config.exchange, {type: 'headers', durable: true}, function(exchange) {
			self._exchange = exchange;
			self.connected = true;
			self.emit('ready');
		});
	});
	
	this._connection.on('error', function() {}); //Don't do anything on error, just capture so it so we can reconnect

	this._connection.on('close', function() {
		self.connected = false;

		//Only reconnect if the this.close() hasn't been called
		if(!self.closeRequested) {
			self._connection.reconnect();
		} else {
			self._connection.destroy();
		}
	});

	return self;
};

// Clean up the connection and set a flag so that the 'close' event handler doesn't accidentally try to reconnect.
ManagedAmqp.prototype.close = function() {
	this.closeRequested = true;
	this._connection.destroy();
};

// A simple getter for the connection state.
ManagedAmqp.prototype.isConnected = function() {
	return this.connected;
};

// Publish a message into AMQP...a straight pass-thru into amqp::publish().
ManagedAmqp.prototype.publish = function(routingKey, message, headers, contentType) {
	var options = {
		headers: headers,
		deliveryMode: 1,
		contentType: contentType
	}
	this._exchange.publish(routingKey, message, options);
};

module.exports = ManagedAmqp;

