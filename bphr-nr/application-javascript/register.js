/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');
const { registerAndEnrollUser } = require('./utils.js');

const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');


function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}



let userID, userType;
process.argv.forEach(function (val, index, array) {
	userID = array[2];
	userType = array[3];
});

async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		switch (userType) {
			case 'student': {
				userID = 'stud_' + userID;
				break;
			}
			case 'outlet': {
				userID = 'out_' + userID;
				break;
			}
			case 'university': {
				userID = 'uni_' + userID;
				break;
			}
		}
		if (userID.startsWith('stud_') || userID.startsWith('out_') || userID.startsWith('uni_')) {
			console.log('User ID is augmented to', userID);
		} else {
			console.log('Invalid user type :', userType);
			return;
		}

		// Check to see if we've already enrolled the user
		const userIdentity = await wallet.get(userID);
		if (userIdentity) {
			console.log(`An identity for the user ${userID} already exists in the wallet`);
			return userID;
		}

		// Must use an admin to register a new user
		const adminIdentity = await wallet.get('admin');
		if (!adminIdentity) {
			console.log('An identity for the admin user "admin" does not exist in the wallet');
			console.log('Run the enrollAdmin.js application before retrying');
			return;
		}

		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, 'admin');

		// Register the user, enroll the user, and import the new identity into the wallet.
		// if affiliation is specified by client, the affiliation value must be configured in CA
		const secret = await caClient.register({
			enrollmentID: userID,
			role: 'client'
		}, adminUser);
		const enrollment = await caClient.enroll({
			enrollmentID: userID,
			enrollmentSecret: secret
		});
		const x509Identity = {
			credentials: {
				certificate: enrollment.certificate,
				privateKey: enrollment.key.toBytes(),
			},
			mspId: mspOrg1,
			type: 'X.509',
		};
		await wallet.put(userID, x509Identity);
		console.log(`Successfully registered and enrolled user ${userID} and imported it into the wallet`);

		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: userID,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
			console.log('Connected to Fabric gateway.');
			const network = await gateway.getNetwork('mychannel');

			const contract = network.getContract('bphr');

			console.log('\n--> Submit Transaction: RegisterUser');
			let result = await contract.submitTransaction('RegisterUser', userID);
			console.log(`*** Chaincode state updated with user`);

			if (userID.startsWith('uni')) {
				console.log('\n--> Submit Transaction: GetRewardUni (init 10 reward assets)');
				result = await contract.submitTransaction('GetRewardUni', userID);
				console.log(`*** Chaincode state updated with university`);
			}


		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}


	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		process.exit(1);
	}
}


main();
