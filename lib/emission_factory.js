var ManagedAmqp = require('./managed_amqp');
var util = require('util');
var BSON = require('buffalo');
var _ = require('underscore')._;
var sys = require('sys');

// Overview
// --------
// `Emission` buffers events into an in-memory queue and drops them into an AMQP buffer when connected.  When not connected, this module attempts to preserve up to `maxQueueSize` entries to be flushed into AMQP once connected.
// It is important for the `emit()` method to introduce as little blocking as possible in order to minimize impact to the application.
//
// `config.maxQueueSize` represents the number of items to buffer during an AMQP outage.
//When the max is reached, the capped collection will drop the earliest emission.  When AMQP is restored, the buffer will be flushed.
//The default value is 1000.
function EmissionFactory(config, amqp) {	
	this._isNoop = (config.style === "noop");

	this._connections = [];

	if(!this._isNoop) {
		//We only need all this stuff if we're in "connected" mode...

		this._maxQueueSize = config.maxQueueSize || 1000;
		this._emissionQueue = [];

		//Initialize the Managed AMQP connection
		if(Array.isArray(config.amqp)) {
			_.each(config.amqp, function(e) {
				this._addConnection(amqp, e);
			}, this);
		}
		else {
			this._addConnection(amqp, config.amqp);
		}
	}
}

EmissionFactory.prototype._addConnection = function(amqp, config) {
	var me = this;
	console.log("Adding connection for " + config.host);
	var conn = new ManagedAmqp(amqp, config);
	conn.debug = config.host;

	conn.on('ready', function() {
		//Flush any emissions that have piled up while attempting to connect or reconnect.
		me._flushEmissions();
	});
	conn.connect();
	this._connections.push(conn);
}

EmissionFactory.prototype.close = function() {
	//Set the flag so that any new emissions are just dropped
	this._isNoop = true;

	_.each(this._connections, function(conn) {
		conn.close();
	}, this);
};

EmissionFactory.prototype._emit = function(message) {
	//Noop just drops the emission rather than buffering it into AMQP
	if(this._isNoop) {
		return;
	}

	//Respect the `maxQueueSize`
	if(this._emissionQueue.length === this._maxQueueSize) {
		this._emissionQueue.shift();
	}

	this._emissionQueue.push(message);
	this._flushEmissions();
};

EmissionFactory.prototype._getAllOpenConnections = function() {
	return _.shuffle(_.filter(this._connections, function(conn) {
		return conn.isConnected();
	}));
}

EmissionFactory.prototype._flushEmissions = function() {
	//Calling this method when not connected should essentially be a no-op.
	var conns = this._getAllOpenConnections();

	if(conns.length > 0) {

		var emission = this._emissionQueue.shift();
		while(emission && conns.length > 0) {

			var conn = _.first(conns);
			if(conn.isConnected()) {
				var headers = {
					'X-SIGINT-SRC': emission.s.a,
					'X-SIGINT-TYPE': emission.t
				};

				if(emission.hasOwnProperty("o")) {
					headers['X-SIGINT-OP'] = emission.o;
				}

				if(emission.hasOwnProperty("g")) {
					headers['X-SIGINT-TRGT'] = emission.g;
				}
				console.log("Publishing to " + conn.debug);
				conn.publish(emission.t, BSON.serialize(emission), headers);

				emission = this._emissionQueue.shift();

				conns = _.shuffle(conns);
			}
			else {
				//We want to drop this connection from the connections array because it is apparently no longer active
				conns = _.reject(conns, function(e) { return !(e == conn);});
			}
		}
	}
};

module.exports = EmissionFactory;