'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const fs = require('fs');
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
function prettyJSONString(inputString) {
  return JSON.stringify(JSON.parse(inputString), null, 2);
}

let userID, outletID, purchaseDate;
process.argv.forEach(function (val, index, array) {
  userID = array[2];
  outletID = array[3];
  purchaseDate = array[4]; // date in format: YYYY-MM-DD
});

async function main() {
  try {
    userID = 'stud_' + userID;
    outletID = 'out_' + outletID;
    const enteredDate = new Date(purchaseDate);
    if (isNaN(enteredDate)) {
      throw ('Invalid date format. Please use YYYY-MM-DD.');
    }
    const confirmedDate = enteredDate.toISOString().slice(0, 10);

    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get(userID);
    if (!identity) {
      console.log(`An identity for the user ${userID} does not exist in the wallet`);
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
        identity: userID,
        discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
      });

      // Build a network instance based on the channel where the smart contract is deployed
      const network = await gateway.getNetwork('mychannel');

      // Get the contract from the network.
      const contract = network.getContract('bphr');

      console.log('\n--> Submit Transaction: CreatePurchase, creates new purchase');
      let result = await contract.submitTransaction('CreatePurchase', userID, outletID, confirmedDate);
      console.log(`*** Result: ${prettyJSONString(result.toString())}`);



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
