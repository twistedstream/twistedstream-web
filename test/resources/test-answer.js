/* global describe, it */
/* jshint expr: true */
'use strict';

var jwt = require('jsonwebtoken');
var expect = require('chai').expect;
require('co-mocha');
var helpers = require('../helpers');

var app = require('../../app');
var request = require('co-supertest').agent(app.callback());

describe("API Answer (/answer) resource", function () {
  describe("POST", function () {
    it("with no code should return a 400 due to a missing field", function *() {
      var response = yield request
        .post('/api/answer')
        .send({})
        .expect(400)
        .end();

      expect(response.text).to.match(/missing required field/i);
    });

    it("with incorrect code should return a 400 due to not passing tests", function *() {
      var response = yield request
        .post('/api/answer')
        .send({
          code: 'return 42;'
        })
        .expect(400)
        .end();

      expect(response.text).to.match(/your code didn't quite pass/i);
    });

    it("with infinite loop code should return a 400 due to taking too long", function *() {
      var response = yield request
        .post('/api/answer')
        .send({
          code: 'while (true) {}'
        })
        .expect(400)
        .end();

      var body = response.body;
      expect(body).to.have.property('message')
        .and.match(/your code took too long/i);
    });

    it("with satisfying code should return a 200 with a valid access token", function *() {
      var response = yield request
        .post('/api/answer')
        .send({
          code: helpers.passingCodeExpression
        })
        .expect(200)
        .end();

      var body = response.body;
      expect(body).to.have.property('access_token');
      expect(jwt.verify(body.access_token, process.env.JWT_SECRET))
        .to.have.property('message', 'I got in!');
    });
  });
});
