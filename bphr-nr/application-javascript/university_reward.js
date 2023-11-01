'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const fs = require('fs');
const { hasConsecutivePurchases } = require('./utils.js');
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
function prettyJSONString(inputString) {
  return JSON.stringify(JSON.parse(inputString), null, 2);
}

let uniID, studentID;
process.argv.forEach(function (val, index, array) {
  uniID = array[2];
  studentID = array[3];
});

async function main() {
  try {
    uniID = 'uni_' + uniID;
    studentID = 'stud_' + studentID;

    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get(uniID);
    if (!identity) {
      console.log(`An identity for the user ${uniID} does not exist in the wallet`);
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    const gateway = new Gateway();

    try {
      // setup the gateway instance
      // The user will now be able to create connections to the fabric network and be able to
      // submit transactions and query. All transactions submitted by this gateway will be
      // signed by this user using the credentials stored in the wallet.
      await gateway.connect(ccp, {
        wallet,
        identity: uniID,
        discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
      });

      // Build a network instance based on the channel where the smart contract is deployed
      const network = await gateway.getNetwork('mychannel');

      // Get the contract from the network.
      const contract = network.getContract('bphr');

      console.log('\n--> Submit Transaction: TransferReward');
      await contract.submitTransaction('TransferReward', uniID, studentID);
      console.log(`*** Reward Successfully transferred ***`);

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
