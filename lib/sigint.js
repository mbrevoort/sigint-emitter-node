var EmissionFactory = require('./emission_factory');

// Overview
// --------
// `SIGINT` provides a fluent API for emitting events.
//
// Config
// ------
// The configuration looks like:
//
//		{
//        style: 'noop' | 'amqp',
//        maxQueueSize: //Default 1000,
//        node_name: 'myapp01c',
//        app_name: 'myapp'
//        amqp: {
//				host: //Broker hostname/ip,
//				exchange: //Exchange name
//			}
//		}
//
// `maxQueueSize` represents the number of items to buffer during an AMQP outage.
//When the max is reached, the capped collection will drop the earliest emission.  When AMQP is restored, the buffer will be flushed.
//The default value is 1000.
function SIGINT(config, amqp) {
    this.emission = new EmissionFactory(config, amqp);
    this._config = config;
}

SIGINT.prototype.close = function() {
	this.emission.close();
};

SIGINT.prototype._overrideEmission = function(e) {
	this.emission = e;
};

SIGINT.prototype._skeleton = function(type) {
	var me = this;
	var message = {
		v: 1, //Spec version 1
		s: {
			n: this._config.node_name,
			a: this._config.app_name
		},
		w: Date.now(),
		t: type
	};

	return {
		emit: function() {
			me.emission._emit(message);
		},
		at: function(when) {
			message.w = when;
			return this;
		},
		against: function(name) {
			message.g = name;
			return this;
		},

		message: message
	};
};

SIGINT.prototype.announce = function() {
	var returnVal = this._skeleton("a");
	returnVal.message.d = {v: "", s: []};

	returnVal.stack_item = function(name) {
		return {
			version: function(value) {
				returnVal.message.d.s.push({n: name, v: value});
				return returnVal;
			}
		};
	};
	returnVal.stack = function(arg) {
		for(var i=0; i < arg.length; i++)
		{
			returnVal.stack_item(arg[i].name).version(arg[i].version);
		}
		return returnVal;
	}
	returnVal.app_version = function(value) {
		returnVal.message.d.v = value;
		return returnVal;
	}

	return returnVal;
};

SIGINT.prototype.count = function(operation) {
	var returnVal = this._skeleton("c");
	returnVal.message.o = operation;
	returnVal.message.d = 1;

	returnVal.times = function(n) {
		returnVal.message.d = n;
		return returnVal;
	};

	return returnVal;
};

SIGINT.prototype.time = function(operation) {
	var returnVal = this._skeleton("t");
	returnVal.message.o = operation;

	returnVal.duration = function(value) {
		returnVal.message.d = value;
		return returnVal;
	}

	returnVal.start = function() {
		var marked = Date.now();

		return {
			emit: function() {
				returnVal.duration(Date.now() - marked).emit();
			}
		};
	};

	return returnVal;	
};

module.exports = SIGINT;