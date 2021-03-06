const { expect } = require('chai');
const { startApiBuilder, stopApiBuilder, requestAsync, sendToElasticsearch, getRandomInt } = require('./_base');
const fs = require('fs');

describe('Traffic Monitor API', function () {
	this.timeout(30000);
	let server;
	let auth;
	const indexName = `circuitpath_test_${getRandomInt(9999)}`;

	/**
	 * Start API Builder.
	 */
	before(() => {
		return new Promise(function(resolve, reject){
			server = startApiBuilder();
			auth = {
				user: server.apibuilder.config.apikey || 'test',
				password: ''
			};
			server.apibuilder.config.testElasticIndex = indexName;
			elasticConfig = server.apibuilder.config.pluginConfig['@axway-api-builder-ext/api-builder-plugin-fn-elasticsearch'].elastic;
			server.started
			.then(() => {
				const entryset = require('./documents/basic/circuitpath_test_documents');
				sendToElasticsearch(elasticConfig, indexName, entryset)
				.then(() => {
					resolve();
				});
			});
		});
	});

	/**
	 * Stop API Builder after the tests.
	 */
	after(() => stopApiBuilder(server));

	describe('circuitpath endpoint tests', () => {

		it('[circuitpath-0001] Should return http 200 and (Health Check) Policy with 2 filters', () => {
			return requestAsync({
				method: 'GET',
				uri: `http://localhost:${server.apibuilder.port}/api/elk/v1/api/router/service/instance-1/ops/stream/4e645e5e4600bb590c881179/*/circuitpath`,
				auth: auth,
				json: true
			}).then(({ response, body }) => {
				expect(response.statusCode).to.equal(200);
				expect(body).to.be.an('Array');
				expect(body).to.have.lengthOf(1);
				expect(body[0]).to.be.an('Object');
				expect(body[0]).to.have.property('policy');
				expect(body[0].policy).to.equal('Health Check');
				expect(body[0].filters).to.be.an('Array');
				expect(body[0].filters).to.have.lengthOf(2);
				expect(body[0].filters[0].status).to.equal('Pass');
			});
		});
		it('[circuitpath-0002] Should return HTTP 200 and a API Broker Policy with 2 Filters and sub-Policys and -filters', () => {
			return requestAsync({
				method: 'GET',
				uri: `http://localhost:${server.apibuilder.port}/api/elk/v1/api/router/service/instance-1/ops/stream/c8705e5ecc00adca32be7472/*/circuitpath`,
				auth: auth,
				json: true
			}).then(({ response, body }) => {
				expect(response.statusCode).to.equal(200);
				expect(body).to.be.an('Array');
				expect(body).to.have.lengthOf(1);
				expect(body[0]).to.be.an('Object');
				expect(body[0]).to.have.property('policy');
				expect(body[0].policy).to.equal('API Broker');
				expect(body[0].filters).to.be.an('Array');
				expect(body[0].filters).to.have.lengthOf(2);
				expect(body[0].filters[0].status).to.equal('Pass');
				expect(body[0].filters[0].subPaths).to.not.exist;
				expect(body[0].filters[1].subPaths).to.be.an('Array');
				expect(body[0].filters[1].subPaths).to.have.lengthOf(1);
				expect(body[0].filters[1].subPaths[0].policy).to.equal('Default API Proxy Routing');
				expect(body[0].filters[1].subPaths[0].filters).to.have.lengthOf(1);

			});
		});
		it('[circuitpath-0003] Should return http 200 and an empty array because no policies have been executed', () => {
			return requestAsync({
				method: 'GET',
				uri: `http://localhost:${server.apibuilder.port}/api/elk/v1/api/router/service/instance-1/ops/stream/edb1705e7d0168a34d74bfba/*/circuitpath`,
				auth: auth,
				json: true
			}).then(({ response, body }) => {
				expect(response.statusCode).to.equal(200);
				expect(body).to.be.an('Array');
				expect(body).to.have.lengthOf(0);
			});
		});
		it('[circuitpath-0004] Should return http 200 and empty array even the correlationID does not exist in database', () => {
			return requestAsync({
				method: 'GET',
				uri: `http://localhost:${server.apibuilder.port}/api/elk/v1/api/router/service/instance-1/ops/stream/111111111111111111111111/*/circuitpath`,
				auth: auth,
				json: true
			}).then(({ response, body }) => {
				expect(response.statusCode).to.equal(200);
				expect(body).to.be.an('Array');
				expect(body).to.have.lengthOf(0);
			});
		});
		it('[circuitpath-0005] Should return http 200 and have a API Manager Protection Policy with 7 filters with 2 fails and subpath with several filters', () => {
			return requestAsync({
				method: 'GET',
				uri: `http://localhost:${server.apibuilder.port}/api/elk/v1/api/router/service/instance-1/ops/stream/1ab3705e920284217e6aae73/*/circuitpath`,
				auth: auth,
				json: true
			}).then(({ response, body }) => {
				expect(response.statusCode).to.equal(200);
				expect(body).to.be.an('Array');
				expect(body).to.have.lengthOf(1);
				expect(body).to.have.lengthOf(1);
				expect(body[0].filters).to.be.an('Array');
				expect(body[0].policy).to.equal('API Manager Protection Policy');
				expect(body[0].filters).to.have.lengthOf(7);
				expect(body[0].filters[0].status).to.equal('Pass');
				expect(body[0].filters[1].status).to.equal('Pass');
				expect(body[0].filters[2].status).to.equal('Fail');
				expect(body[0].filters[3].status).to.equal('Pass');
				expect(body[0].filters[4].status).to.equal('Fail');
				expect(body[0].filters[5].status).to.equal('Pass');
				expect(body[0].filters[6].status).to.equal('Pass');
				expect(body[0].filters[1].subPaths).to.be.an('Array');
				expect(body[0].filters[1].subPaths).to.have.lengthOf(1);
				expect(body[0].filters[1].subPaths[0].policy).to.equal('Secure Headers');
				expect(body[0].filters[1].subPaths[0].filters).to.have.lengthOf(7);
				expect(body[0].filters[1].subPaths[0].filters[0].status).to.equal('Pass');
				expect(body[0].filters[1].subPaths[0].filters[1].status).to.equal('Pass');
				expect(body[0].filters[1].subPaths[0].filters[2].status).to.equal('Pass');
				expect(body[0].filters[1].subPaths[0].filters[3].status).to.equal('Pass');
				expect(body[0].filters[1].subPaths[0].filters[4].status).to.equal('Pass');
				expect(body[0].filters[1].subPaths[0].filters[5].status).to.equal('Pass');
				expect(body[0].filters[1].subPaths[0].filters[6].status).to.equal('Pass');
			});
		});

	});
});
	
