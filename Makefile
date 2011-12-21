test:
	./node_modules/nodeunit/bin/nodeunit test/*.js

docs:
	./node_modules/docco-husky/bin/generate  -name "SIGINT Emitter For Node.js" *.js lib test app

clean:
	rm -fR docs

.PHONY: package test docs clean
