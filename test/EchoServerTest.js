"use strict";
var sinon = require('sinon');
var expect = require('expect.js');
var EchoServer = require('./../dist/echo-server');

describe('EchoServer', function() {

	var echo;

	beforeEach(function(){
		echo = new EchoServer.EchoServer();
		// Don't pollute test output with logs
		echo.log = function(){};
	});

    it('should provide a EchoServer class export', function() {
      expect(EchoServer.EchoServer).not.to.be(undefined);
      expect(EchoServer.EchoServer).to.be.a('function');
    });

    it('should start a socket.io server without ssl', function() {
    	var startSocketIoServer = sinon.spy(echo, 'startSocketIoServer'),
    		loadSSL = sinon.spy(echo, 'loadSSL');

      	echo.run();

      	expect(startSocketIoServer.calledOnce).to.be.ok();
      	expect(loadSSL.calledOnce).not.to.be.ok();
    });

    it('should start a socket.io server with ssl', function() {
    	var startSocketIoServer = sinon.spy(echo, 'startSocketIoServer'),
    		loadSSL = sinon.spy(echo, 'loadSSL');

      	echo.run({
      		host: 'https://localhost',
      	});

      	expect(startSocketIoServer.calledOnce).to.be.ok();
      	expect(loadSSL.calledOnce).to.be.ok();
    });

    it('should publish options after running', function() {
		expect(echo.options).to.be.eql(undefined);

      	echo.run();

      	expect(echo.options).to.be.an('object');
      	expect(echo.options.host).to.be.eql('http://localhost');
      	expect(echo.options.port).to.be.eql(6001);
    });

    it('should not load ssl without certificates', function(done) {
    	echo.options = {};
      	echo.loadSSL().then(function(){}, function(){
      		done();
      	});
    });

    it('should load ssl with certificates', function(done) {
    	echo.options = {
    		sslCertPath: __dirname+'/fixtures/ssl_certificate',
    		sslKeyPath: __dirname+'/fixtures/ssl_key'
    	};
      	echo.loadSSL().then(function(){
			done();
      	}, function(){});
    });

});