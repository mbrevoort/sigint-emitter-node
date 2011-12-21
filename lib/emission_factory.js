var ManagedAmqp = require('./managed_amqp');
var util = require('util');
var BSON = require('buffalo');

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

	if(!this._isNoop) {
		//We only need all this stuff if we're in "connected" mode...

		this._maxQueueSize = config.maxQueueSize || 1000;
		this._emissionQueue = [];

		//Initialize the Managed AMQP connection
		this._connection = new ManagedAmqp(amqp, config.amqp);

		var me = this;
		this._connection.on('ready', function() {
			//Flush any emissions that have piled up while attempting to connect or reconnect.
			me._flushEmissions();
		});
		this._connection.connect();
	}
}

EmissionFactory.prototype.close = function() {
	//Set the flag so that any new emissions are just dropped
	this._isNoop = true;
	
	this._connection.close();
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

EmissionFactory.prototype._flushEmissions = function() {
	//Calling this method when not connected should essentially be a no-op.
	if(this._connection.isConnected()) {

		var emission = this._emissionQueue.shift();
		while(emission) {
			this._connection.publish(emission.t, BSON.serialize(emission));

			emission = this._emissionQueue.shift();
		}
	}
};

module.exports = EmissionFactory;