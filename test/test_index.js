var		testCase = require('nodeunit').testCase
	,	nodemock = require("nodemock")
	,	util = require('util')
	,	SIGINT = require('./../index.js')
;

module.exports = {
	"announce builds a proper message": function(test) {
		var expected = {
			v: 1,
			s: {
				n: "node1",
				a: "app1"
			},
			w: "some date",
			t: "a",
			d: {
				v: "1.2.3",
				s: [
					{n: "node", v: "1"},
					{n: "connect", v: "2"},
					{n: "nodeunit", v: "1"}
				]
			}
		};

		var sigint = new SIGINT({style: "noop", node_name: "node1", app_name: "app1"}, null);

		var mockEmission = nodemock.mock("_emit").takes(expected);
		sigint._overrideEmission(mockEmission);

		sigint.announce()
			.at("some date")
			.app_version("1.2.3")
			.stack_item("node").version("1")
			.stack_item("connect").version("2")
			.stack([{name: "nodeunit", version: "1"}])
			.emit();

		mockEmission.assert();

		test.done();
	},

	"count builds a proper message for once()": function(test) {
		var expected = {
			v: 1,
			s: {
				n: "node1",
				a: "app1"
			},
			w: "some date",
			t: "c",
			o: "operation1",
			d: 1
		};

		var sigint = new SIGINT({style: "noop", node_name: "node1", app_name: "app1"}, null);

		sigint.emission = nodemock.mock("_emit").takes(expected);

		sigint.count("operation1")
			.at("some date")
			.emit();

		sigint.emission.assert();

		test.done();
	},

	"count builds a proper message for times()": function(test) {
		var expected = {
			v: 1,
			s: {
				n: "node1",
				a: "app1"
			},
			w: "some date",
			t: "c",
			o: "operation1",
			d: 14
		};

		var sigint = new SIGINT({style: "noop", node_name: "node1", app_name: "app1"}, null);

		sigint.emission = nodemock.mock("_emit").takes(expected);

		sigint.count("operation1")
			.at("some date")
			.times(14)
			.emit();

		sigint.emission.assert();

		test.done();
	},

	"time builds a proper message": function(test) {
		var expected = {
			v: 1,
			s: {
				n: "node1",
				a: "app1"
			},
			w: "some date",
			t: "t",
			o: "operation1",
			d: 10,
			g: "app2"
		};

		var sigint = new SIGINT({style: "noop", node_name: "node1", app_name: "app1"}, null);

		sigint.emission = nodemock.mock("_emit").takes(expected);

		sigint.time("operation1")
			.at("some date")
			.against("app2")
			.duration(10)
			.emit();

		sigint.emission.assert();

		test.done();
	},

	"time builds a proper message with the start() semantics": function(test) {
		var expected = {
			v: 1,
			s: {
				n: "node1",
				a: "app1"
			},
			w: "some date",
			t: "t",
			o: "operation1",
			d: 0,
			g: "app2"
		};

		var sigint = new SIGINT({style: "noop", node_name: "node1", app_name: "app1"}, null);

		sigint.emission = nodemock.mock("_emit").takes(expected);

		var timer = sigint.time("operation1")
			.at("some date")
			.against("app2")
			.start();

		timer.emit();

		sigint.emission.assert();

		test.done();
	}
};