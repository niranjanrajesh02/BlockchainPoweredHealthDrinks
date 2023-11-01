#!/bin/bash

pushd ../test-network
./network.sh down
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn bphr -ccp ../bphr-nr/chaincode/ -ccl javascript
popd

pushd ./application-javascript
rm -rf wallet #remove wallet if exists
node register.js niranjan student #register niranjan as student
node register.js fuelzone outlet #register fuelzone as outlet
node register.js ashoka university #register ashoka as university
node view_rewards.js uni_ashoka #shows all the reward assets held by ashoka uni
node purchase.js niranjan fuelzone 2020-01-01  #recording purchase0
node purchase.js niranjan fuelzone 2020-01-02  #recording purchase1
node purchase.js niranjan fuelzone 2020-01-03  #recording purchase2
node outlet_purchases.js fuelzone #shows all purchases made to fuelzone
node university_list.js ashoka niranjan #should be empty list
node outlet_validate.js fuelzone p_0 #validate purchase0
node outlet_validate.js fuelzone p_1 #validate purchase1
node outlet_validate.js fuelzone p_2 #validate purchase2
node university_list.js ashoka niranjan #should be list with three purchases
node view_rewards stud_niranjan #shows all the reward assets held by niranjan before reward 
node university_reward.js ashoka niranjan #reward if condition is met 
node view_rewards stud_niranjan #shows all the reward assets held by niranjan after reward
popd