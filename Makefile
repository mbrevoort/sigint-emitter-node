test:
	./node_modules/nodeunit/bin/nodeunit test/*.js

docs:
	./node_modules/.bin/docco-husky  -name "SIGINT Emitter For Node.js" *.js lib test

.PHONY: package test docs 
