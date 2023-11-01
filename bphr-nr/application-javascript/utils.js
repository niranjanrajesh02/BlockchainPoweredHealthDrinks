async function registerAndEnrollUser(caClient, wallet, orgMspId, userId, affiliation, userType) {
  try {
    switch (userType) {
      case 'student': {
        userId = 'stud_' + userId;
        break;
      }
      case 'outlet': {
        userId = 'out_' + userId;
        break;
      }
      case 'university': {
        userId = 'uni_' + userId;
        break;
      }
    }
    if (userId.startsWith('stud_') || userId.startsWith('out_') || userId.startsWith('uni_')) {
      console.log('User ID is augmented to', userId);
    } else {
      console.log('Invalid user type :', userType);
      return;
    }

    // Check to see if we've already enrolled the user
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(`An identity for the user ${userId} already exists in the wallet`);
      return userId;
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
      affiliation: affiliation,
      enrollmentID: userId,
      role: 'client'
    }, adminUser);
    const enrollment = await caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(userId, x509Identity);
    console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
    return userId;
  } catch (error) {
    console.error(`Failed to register user : ${error}`);
  }
};

function hasConsecutivePurchases(purchases) {
  const sortedDates = Object.keys(purchases).sort((a, b) => new Date(a) - new Date(b));
  console.log(sortedDates);
  const currentDate = new Date(sortedDates[0]);
  let consecutiveDaysCount = 0;

  for (const date of sortedDates) {
    const purchaseDate = new Date(date);
    const timeDiff = Math.abs(purchaseDate - currentDate);
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      consecutiveDaysCount++;
    } else {
      consecutiveDaysCount = 1; // Reset consecutive count
    }

    currentDate.setDate(currentDate.getDate() + 1);

    if (consecutiveDaysCount === 2) {
      return true;
    }
  }

  return false;
}

// export both functions
module.exports = { registerAndEnrollUser, hasConsecutivePurchases };