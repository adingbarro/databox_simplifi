require('dotenv').config();
const moment = require('moment-timezone');
const axios = require('axios').default;
const Databox = require('databox');
const DATABOX_TOKEN = process.env.DATABOX_TOKEN;
const SIMPLIFI_KEY = process.env.SIMPLIFI_APP_KEY;
const SIMPLIFI_USER = process.env.SIMPLIFI_USER_KEY;
const SIMPLIFI_ORGANIZATION_ID = process.env.SIMPLIFI_ORGANIZATION_ID;
const client = new Databox({
    push_token: DATABOX_TOKEN
});

let campaigns = {};
let campaignStats = [];

async function getCampaigns(){
  console.log('Getting all campaigns');

  let url = `https://app.simpli.fi/api/organizations/${SIMPLIFI_ORGANIZATION_ID}/campaigns`;
  await axios.get(url, {
    headers: {
      'X-App-Key': SIMPLIFI_KEY,
      'X-User-Key': SIMPLIFI_USER,
      'Content-Type': 'application/json'
    }
  }).then(({data}) => {
    if(data.hasOwnProperty('campaigns')){
      data.campaigns.forEach((campaign, i) => {
        campaigns[campaign.id] = {
          name: campaign.name,
          id: campaign.id,
          total_budget: campaign.total_budget,
          goal: campaign.campaign_goal.goal_value + ' ' + campaign.campaign_goal.goal_type
        };

      });
    }
  }).catch((error)=>{
    console.log('Error getting data from Simlifi')
    console.log(error)
  });
  return campaigns;
}

async function getCampaignStats(){
  const start_date = '2021-02-21';
  const end_date = moment().tz("America/Los_Angeles").format("YYYY-MM-DD");
  let url = `https://app.simpli.fi/api/organizations/${SIMPLIFI_ORGANIZATION_ID}/campaign_stats?start_date=${start_date}&end_date=${end_date}&by_campaign=true&by_day=true`;
  console.log(`getting campaign stats from ${start_date} to today ${end_date}`);
  await axios.get(url, {
    headers: {
      'X-App-Key': SIMPLIFI_KEY,
      'X-User-Key': SIMPLIFI_USER,
      'Content-Type': 'application/json'
    }
  }).then(({data}) => {
    if(data.hasOwnProperty('campaign_stats')){
      if(data.hasOwnProperty('campaign_stats')){
        data.campaign_stats.forEach((stat, i) => {
          let data = {};
          if(campaigns.hasOwnProperty(stat.campaign_id)){
            data.key = campaigns[stat.campaign_id].name;
            data.value = stat.total_spend;
            data.date = stat.stat_date;
            let temp = {...stat};
            delete temp.stat_date;
            delete temp.total_spend;
            delete temp.resource;
            delete temp.resources;
            delete temp.name;
            data.attributes = {
              goal: campaigns[stat.campaign_id].goal,
              total_budget: campaigns[stat.campaign_id].total_budget ? campaigns[stat.campaign_id].total_budget : 0,
              ...temp
            };
            campaignStats.push(data);
          }
        });

      }
    }
  }).catch((error)=>{
    console.log('Error getting data from Simlifi')
    console.log(error)
  });
  return campaignStats;
}

async function sendDataToDatabox(){
  try {
    await client.insertAll(campaignStats);
  } catch (e) {
    console.log(e);
  }
  return true;
}

getCampaigns()
.then((campaigns) => {
  console.log('got campaigns ');
  // console.log(campaigns);
  getCampaignStats().then(()=>{
    console.log('completed getting campaign stats: ' + campaignStats.length);
    // console.log(campaignStats);

    /* Uncomment this when you are ready to push to databox
    sendDataToDatabox()
      .then(() => {
        console.log('Campaign stats pushed to databox');
      });
    */

  });
});
