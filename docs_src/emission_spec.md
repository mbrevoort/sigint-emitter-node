Emission Specification
======================

BSON Data Structure
-------------------


Guidelines For Emitter Libraries
--------------------------------
* The timestamp should be a Unix Time-based integer timestamp (c.f. [http://en.wikipedia.org/wiki/Unix_time](http://en.wikipedia.org/wiki/Unix_time))
* Be prepared to publish to multiple RabbitMQ instances (round-robin)
* Be prepared to buffer some events while a Rabbit is being restarted