A client API for emitting measurements and counters into the SIGINT analytics system.

Configuration
=============
	{
		style: "amqp" | "noop",
		maxQueueSize: 1000			//Default 1000
		amqp: {
			exchange: "sigint",
			host: "localhost",
			port: 5672				//port is optional
		},
		node_name: "myapp01c",
		app_name: "myapp"
	}

*	`style` tells the library whether to run in connected or disconnected mode. Disconnected ("noop") mode means emissions are silently dropped.  Connected mode means emissions are published into the AMQP broker.

* `maxQueueSize` determines the buffer size for emissions when in connected mode is enabled but the broker is currently unavailable.  When the max queue size is reached, any new emission will cause the earliest emission to be dropped.

* `amqp` is passed directly into the amqp connection, plus the `exchange` name, which, is used for publishing messages.  If the value is an array, multiple amqp brokers can be chosen for random load-balanced publication into multiple brokers.

* `node_name` represents the name of the machine where this application is running.

* `app_name` represents the name of the application.

An example of a config with multiple AMQP brokers:

	{
		style: "amqp" | "noop",
		maxQueueSize: 1000
		amqp: [						//amqp can be a single object or an array of
			{
				exchange: "sigint",
				host: "amqp01",
				port: 5672
			},
			{
				exchange: "sigint",
				host: "amqp02",
				port: 5672
			},
		]
		node_name: "myapp01c",
		app_name: "myapp"
	}

Fluent API
==========

Counter
-------
	var SIGINT = require('sigint');

	var sigint = new SIGINT({style: 'noop', node_name: 'fooapp01', app_name: 'fooapp'});

	//Emit a counter with a data value of 1
	sigint.count("login").emit();

	//Emit a counter with a data value of 14
	sigint.count("login").times(14).emit();


Timer (Explicit Duration)
-------------------------
	var SIGINT = require('sigint');

	var sigint = new SIGINT({style: 'noop', node_name: 'fooapp01', app_name: 'fooapp'});

	//Emit a timer with a data value of 100 milliseconds
	sigint.time("sp_slow_sproc").duration(100).emit();


Timer (Implicit Duration)
-------------------------
	var SIGINT = require('sigint');

	var sigint = new SIGINT({style: 'noop', node_name: 'fooapp01', app_name: 'fooapp'});

	//Start the stopwatch
	var timer = sigint.time("sp_slow_sproc").start();

	...some timeable work...
	
	//Stop the stopwatch and emit a timer with the data value of the time measured
	timer.emit(); 

Emitting The Result Of A Call To An Upstream Service
----------------------------------------------------
All the operation metrics include an `against()` method which can be used for specifying the name of the upstream application:

	var SIGINT = require('sigint');

	var sigint = new SIGINT({style: 'noop', node_name: 'fooapp01', app_name: 'fooapp'});

	//Emit a timer with a data value of 10 milliseconds against the validate_token operation of the idm system:
	sigint.time("validate_token").against("idm").duration(10).emit();
	
	//Emit a counter against the validate_token operation of the idm system:
	sigint.count("validate_token").against("idm").emit();

Announcement
------------
An announcement should be emitted whenever the application is started or restarted.  It includes a hook to supply the version of the application, as well as the versions of any stack dependencies.

	var SIGINT = require('sigint');

	var sigint = new SIGINT({style: 'noop', node_name: 'fooapp01', app_name: 'fooapp'});

	sigint.announce()
		.app_version("1.2.3")
		.stack_item("node").version("0.6.6")
		.stack_item("connect").version("2.0.0")
		.stack([{name: "nodeunit", version: "1.0.3"}])
		.emit();

...stacks can also be supplied as an array of {name:, version:} objects:

	sigint.announce()
		.app_version("1.2.3")
		.stack([
			{name: "node", version: "0.6.6"},
			{name: "connect", version: "2.0.0"}
		])
		.emit();

Signal Generator Application
============================
See [app/sample_generator.js](./app/sample_generator.html).

Emission BSON Specification
===========================
See the official [Emission Specification](emission_spec.html)

ChangeLog
=========

v0.0.1 - 12/21/2011 - Emission Spec v1
	
	* Initial cut

v0.0.2 - 12/21/2011 - Emission Spec v1

	* Documented BSON emission spec
	* Added spec version to BSON

v0.0.3 - 12/21/2011 - Emission Spec v1

	* Publishing to a headers exchange with the following headers:
		* X-SIGINT-SRC (source app name)
		* X-SIGINT-TRGT (target app name)
		* X-SIGINT-OP (operation)
		* X-SIGINT-TYPE (metric type)

v0.0.4 - 01/17/2011 - Emission Spec v1

	* Publishing to multiple AMQP brokers