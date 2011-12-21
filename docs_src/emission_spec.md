Emission Specification
======================

BSON Data Structure
-------------------

### Core Required Properties ###
	{
		s: {
			n: "myapp01c",
			a: "myapp"
		},
		w: 1234567890,
		t: ["a" | "t" | "c"]
	}

* `s` is the application source:
	* `n` node name
	* `a` application name
* `w` is the numeric form of the number of milliseconds since the Unix epoch (1970-01-01T00:00.000Z)
* `t` is the type of emission, an enumeration of "a" (announcement), "t" (timer), and "c" (counter)

### Polymorphic Properties ###

#### Announcement ####
	{
		s: {
			n: "myapp01c",
			a: "myapp"
		},
		w: 1234567890,
		t: "a",
		d: {
			v: "1.2.3",
			s: [
				{n: "node", v: "1"},
				{n: "connect", v: "2"},
				{n: "nodeunit", v: "1"}
			]
		}
	}

* `d` is the polymorphic holder of data specific to the type of emission:
	* `v` is the semantic version of the source application
	* `s` is an array containing `{n:, v:}` objects for whatever platform-related dependencies are relevant to the performance of the application:
		* `n` name of stack item
		* `v` version of stack item

#### Counter ####
	{
		s: {
			n: "myapp01c",
			a: "myapp"
		},
		w: 1234567890,
		t: "c",
		d: 10,
		o: "login"
	}

* `d` is the polymorphic holder of data specific to the type of emission:
	* value is an integer representing the number of times to increment the counter
* `o` is an arbitrary property that specifies the type of operation being counted

#### Timer ####
	{
		s: {
			n: "myapp01c",
			a: "myapp"
		},
		w: 1234567890,
		t: "t",
		d: 100,
		o: "login"
	}

* `d` is the polymorphic holder of data specific to the type of emission:
	* value is an integer representing the number of milliseconds taken to perform the operation
* `o` is an arbitrary property that specifies the type of operation being timed


Guidelines For Emitter Libraries
--------------------------------
* The timestamp should be a Unix Time-based integer timestamp (c.f. [http://en.wikipedia.org/wiki/Unix_time](http://en.wikipedia.org/wiki/Unix_time))
* Be prepared to publish to multiple RabbitMQ instances (round-robin)
* Be prepared to buffer some events while a Rabbit is being restarted