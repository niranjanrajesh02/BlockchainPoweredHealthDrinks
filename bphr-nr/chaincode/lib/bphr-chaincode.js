/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

let purchaseCounter = -1;
let rewardCounter = -1;
let students = [];
let outlets = [];
let universities = [];

let date = 0;

class BPHR extends Contract {

  async InitLedger(ctx) {
    console.log('============= START : Initialize Ledger ===========');
    const purchases = [
      {
        ID: 'p_test0',
        studentID: 'stud_test0',
        outletID: 'out_test0',
        date: 0,
        isValid: false,
        isReward: false,
        owner: null //if reward, then owner is the university/student
      }
    ];

    for (const asset of purchases) {
      asset.docType = 'asset';
      await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
    }
    console.log('============= END : Initialize Ledger ===========');
  }

  async RegisterUser(ctx, id) {
    if (id.startsWith('stud')) {
      students.push(id);
      return JSON.stringify(students);
    } else if (id.startsWith('out')) {
      outlets.push(id);
      return JSON.stringify(outlets);
    } else if (id.startsWith('uni')) {
      universities.push(id);
      return JSON.stringify(universities);
    }
  }

  async GetRewardUni(ctx, uni_id) {
    if (!uni_id in universities) {
      throw new Error(`The university ${uni_id} does not exist. Please register your university.`);
    }
    // 10 rewards
    for (let i = 0; i < 10; i++) {
      rewardCounter = rewardCounter + 1;
      let reward = {
        ID: 'r_' + rewardCounter,
        studentID: null,
        outletID: null,
        date: null,
        isValid: true,
        isReward: true,
        owner: uni_id
      }
      await ctx.stub.putState(reward.ID, Buffer.from(stringify(sortKeysRecursive(reward))));
    }
  }

  // list the first reward university owns
  async ListRewardUni(ctx, uni_id) {
    const results = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
        if (record.owner == uni_id && record.isReward == true) {
          results.push(record);
          break
        }
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      result = await iterator.next();
    }
    return JSON.stringify(results[0]);
  }

  // transfer single reward from uni to student
  async TransferReward(ctx, uni_id, student_id) {
    if (!uni_id in universities) {
      throw new Error(`The university ${uni_id} does not exist. Please register your university.`);
    }
    if (!student_id in students) {
      throw new Error(`The student ${student_id} does not exist. Please ask the student to register first or check the ID you entered.`);
    }
    const results = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
        if (record.owner == uni_id && record.isReward == true) {
          results.push(record);
          break
        }
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      result = await iterator.next();
    }
    if (results.length == 0) {
      throw new Error(`The university ${uni_id} does not have any rewards left.`);
    }
    let reward = results[0];
    reward.owner = student_id;
    await ctx.stub.putState(reward.ID, Buffer.from(stringify(sortKeysRecursive(reward))));
  }



  // Show rewards of user
  async ShowRewards(ctx, user_id) {
    const results = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
        if (record.owner == user_id && record.isReward == true) {
          results.push(record);
        }
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      result = await iterator.next();
    }
    return JSON.stringify(results);
  }


  // CreatePurchase issues a new purchase to the world state with given details.
  async CreatePurchase(ctx, student_id, outlet_id, p_date) {
    purchaseCounter = purchaseCounter + 1;
    if (!outlet_id in outlets) {
      throw new Error(`The outlet ${outlet_id} does not exist. Please ask the outlet to register first or check the ID you entered.`);
    }
    if (!student_id in students) {
      throw new Error(`The student ${student_id} does not exist. Please ask the student to register first or check the ID you entered.`);
    }
    let purchaseID = 'p_' + purchaseCounter;
    const purchase = {
      ID: purchaseID,
      studentID: student_id,
      outletID: outlet_id,
      date: p_date,
      isValid: false,
      isReward: false,
      owner: null
    }
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(purchaseID, Buffer.from(stringify(sortKeysRecursive(purchase))));
    return JSON.stringify(purchase);

  }

  // Get Student purchases that are valid
  async GetStudentValidPurchases(ctx, uni_id, student_id) {
    if (!uni_id in universities) {
      throw new Error(`The university ${uni_id} does not exist. Please register your university.`);
    }
    const results = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
        if (record.studentID == student_id && record.isValid == true && record.isReward == false) {
          results.push(record);
        }
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      result = await iterator.next();
    }
    return JSON.stringify(results);
  }

  // Get Outlet Purchases based on outlet_id
  async GetOutletPurchases(ctx, outlet_id) {
    const results = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
        if (record.outletID == outlet_id && record.isValid == false) {
          results.push(record);
        }
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      result = await iterator.next();
    }
    return JSON.stringify(results);
  }
  async ReadAsset(ctx, id) {
    const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return assetJSON.toString();
  }

  async AssetExists(ctx, id) {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  // validatePurchase validates a purchase with purchase_id
  async ValidatePurchase(ctx, outlet_id, purchase_id) {
    const exists = await this.AssetExists(ctx, purchase_id);
    if (!exists) {
      throw new Error(`The asset ${purchase_id} does not exist`);
    }
    if (!outlet_id in outlets) {
      throw new Error(`The outlet ${outlet_id} does not exist. Please ask the outlet to register first or check the ID you entered.`);
    }
    const purchaseString = await this.ReadAsset(ctx, purchase_id);
    const purchase = JSON.parse(purchaseString);
    if (purchase.outletID != outlet_id) {
      throw new Error(`The outlet ${outlet_id} is not authorized to validate this purchase`);
    }
    purchase.isValid = true;
    return ctx.stub.putState(purchase_id, Buffer.from(stringify(sortKeysRecursive(purchase))));
  }


  // UpdateAsset updates an existing asset in the world state with provided parameters.
  async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
    const exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    // overwriting original asset with new asset
    const updatedAsset = {
      ID: id,
      Color: color,
      Size: size,
      Owner: owner,
      AppraisedValue: appraisedValue,
    };
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
  }


  // TransferAsset updates the owner field of asset with given id in the world state.
  async TransferAsset(ctx, id, newOwner) {
    const assetString = await this.ReadAsset(ctx, id);
    const asset = JSON.parse(assetString);
    const oldOwner = asset.Owner;
    asset.Owner = newOwner;
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    return oldOwner;
  }

  // GetAllAssets returns all assets found in the world state.
  async GetAllAssets(ctx) {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }
}

module.exports = BPHR;