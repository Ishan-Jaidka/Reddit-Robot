/* Ishan Jaidka
 * 
 * Uses Axios to search the Reddit API and get the text of a top post
 * in the given subreddit and submit it to the Synthesia API to generate
 * and AI narration video.
 */

require('dotenv').config();
const axios = require('axios');

const synthesiaApiKey = process.env.synthesiaApiKey;
const synthesiaApiRoot = process.env.synthesiaApiRoot;
const redditApiRoot = process.env.redditApiRoot;

const subreddit = "/r/TwoSentenceComedy";
const time = "day";     // day/week/month/year/all
const number = 3;
const avatar = 'santa_costume1_cameraA';

/*
Characters:

Anna: anna_costume1_cameraA
Bridget: bridget_costume1_cameraA
Dave: dave_costume1_cameraA
Howard: howard_costume1_cameraA
Isabella: isabella_costume1_cameraA
Santa: santa_costume1_cameraA

select "List of stock avatars" on left sidebar:
https://docs.synthesia.io/reference#avatars
*/



getData(subreddit, time, number).then((text) => {
    console.log(text);
    createVideo(text, avatar);    //submits text to Synthesia API
});


/**
 * Gets the text of the nth post from the top posts of 
 * a given time horizon from a subreddit
 * @param {string} subreddit Subreddit to query
 * @param {string} time Time horizon during which to get top posts (day/week/month/year/all)
 * @param {number} number position of post to be retrieved from top posts list
 * @returns 
 */
async function getData(subreddit, time, number){
    try{
        //reddit.com/r/tifu/top.json?t=day
        const res = await axios.get(redditApiRoot + subreddit + '/top.json?t=' + time);
        let title = res.data.data.children[number].data.title;
        let body = res.data.data.children[number].data.selftext;

        //adds '.' to end of title if it doesn't already have one
        if(title[title.length-1] != '.')
            title += '.';
        return title + ' ' + body;
    } catch (error) {
        console.log("Error: " + error);
        throw error;
    }
}

/**
 * Posts request containing text to Synthesia API to generate an AI narration video
 * @param {string} text Text to be narrated
 */
async function createVideo(text, avatar){
    let res = await axios.post(synthesiaApiRoot, {
        "test": true, 
        "input": [{ 
            "script": text, 
            "actor": avatar, 
            "background": "green_screen"
        }] 
    }, {
        headers: {
            'Authorization': synthesiaApiKey,
            'Content-Type': 'application/json'
        }
    });
    console.log('video ID: ' + res.data.id);

    //polls Synthesia for video creation status
    let status = await checkVideoStatus(res.data.id);
    while(status.status == 'IN_PROGRESS'){
        console.log('waiting...');
        
        //blocks thread for 20 seconds
        const date = Date.now();
        let currentDate = null;
        do {
            currentDate = Date.now();
        } while (currentDate - date < 20000);

        //rechecks status
        status = await checkVideoStatus(res.data.id);
        console.log(status.status);
    }

    //prints download link if creation completes successfully, otherwise prints creation status
    if(status.status == 'COMPLETE')
        console.log(status.download);
    else console.log('something went wrong: ' + status.status);
}

/**
 * Checks creation status of Synthesia video given video ID 
 * @param {string} video_ID ID of Synthesia video
 * @returns JSON object containing Synthesia response data of given video ID
 */
async function checkVideoStatus(video_ID){
    let url = synthesiaApiRoot + '/' + video_ID;
    let res = await axios.get(url, {
        headers: {
            'Authorization': synthesiaApiKey
        }
    });

    return res.data;
}