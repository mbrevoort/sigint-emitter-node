// Summary
// =======
// An application for generating sample emissions from one or more applications.  The sibling listener.js application is a great way
// to receive the emissions this application generates.
//
// Running
// =======
//		node sample_generator.js
//
// ...it might be helpful to install RabbitMQ on your own system:
//
//		$> brew install erlang
//		$> brew install rabbitmq
//		$> sudo rabbitmq-plugins enable rabbitmq_management
//		$> sudo rabbitmq-server
//
// ...And you can watch messages go through by browsing to http://localhost:55672 (username "guest" and password "guest").
//

var		amqp = require('amqp')
	,	SIGINT = require('./../index.js')
	,	util = require('util')
;

// Sampler Configuration
// =============
// The sampleConfig has an array `apps` containing one or more application definition.
// Each application must have:
//
// * `name`
// * `nodes` array of strings for each "machine" the app "runs" on
// * `version` string representing the version of the application
// * `stack` array containing stack {name:, version:} objects to be sent with the announcement
// * `time_to_live` function that returns how long the application should "run" before being restarted
// * `emissions` array containing all the emissions that should be emitted from the application:
// 	* `type` specifying the type of emission ("counter", "timer", "announcement")
// 	* `operation` specifying the type of operation that is being measured
// 	* `frequency` function that returns the delay value passed into the interval timer that triggers an emission
// 	* `duration` function that returns the value to be included as the duration of a timer emission
var sampleConfig = {
	apps: [
		{
			name: "app1",
			nodes: ["app1node0", "app1node1", "app1node2"],
			version: "1.2.3",
			stack: [
				{name: "node", version: "0.6.4"}
			],
			time_to_live: function() {
				return Math.max(Math.random()*100001,1);
			},
			emissions: [
				{
					type: "counter",
					operation: "login",
					frequency: function() {
						return 1000 + Math.random() * 100; //Random, between 1 and 2 seconds
					}
				},
				{
					type: "timer",
					operation: "validate_idm_token",
					frequency: function() {
						return 1000 + Math.random() * 100; //Random, between 1 and 2 seconds
					},
					duration: function() {
						return Math.random() * 100;
					}
				}
			]
		}
	]
};

// --- START Application class ---
function Application(config, sigint, name) {
	this._stack = config.stack;
	this._sigint = sigint;
	this._version = config.version;
	this._config = config;
	this._name = name;
	this._intervalHandles = [];
}

Application.prototype.run = function() {
	util.log("Starting application " + this._name + " (version " + this._version + ")");

	this._sigint.announce()
		.stack(this._stack)
		.app_version(this._version)
		.emit();

	var me = this;
	for(var i=0; i < this._config.emissions.length; i++) {
		var emission = this._config.emissions[i];

		var fun = function(){};
		
		if(emission.type == "counter") {
			fun = function() {
				me._sigint.count(emission.operation).emit();	
			};
		} 
		else if (emission.type == "timer") {
			fun = function() {
				me._sigint.time(emission.operation).duration(emission.duration()).emit();
			}
		}

		this._intervalHandles.push(setInterval(fun, emission.frequency()));
	}
}

Application.prototype.stop = function() {
	for(var i=0; i < this._intervalHandles.length; i++) {
		clearInterval(this._intervalHandles[i]);
	}
	this._sigint.close();
	util.log("Stopped application " + this._name + " (version " + this._version + ")");
}
// --- END Application class ---


//Start an instance of each application on each node
for(var i=0; i < sampleConfig.apps.length; i++) {
	for(var z=0; z < sampleConfig.apps[i].nodes.length; z++) {
		var emissionConfig = {
			style: "amqp",
			amqp: {
				exchange: "sigint",
				host: "localhost"
			},
			node_name: sampleConfig.apps[i].nodes[z],
			app_name: sampleConfig.apps[i].name
		};

		launchApp(emissionConfig, sampleConfig.apps[i], sampleConfig.apps[i].nodes[z]);
	}
}

function launchApp(emissionConfig, appConfig, nodeName) {
	var appName = appConfig.name + " -- " + nodeName;

	var app = new Application(appConfig, new SIGINT(emissionConfig, amqp), appName);
	app.run();

	setTimeout(function() {
		app.stop();
		launchApp(emissionConfig, appConfig, nodeName, amqp);
	}, appConfig.time_to_live() );
}





