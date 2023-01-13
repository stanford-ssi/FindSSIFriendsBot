const dotenv = require("dotenv")
dotenv.config()

const { App } = require('@slack/bolt');

var fs = require('fs');
module.exports.fs = fs;

// Slack API
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});



app.command('/find-ssi-friends', async ({ command, ack, respond }) => {

    // Acknowledge command request
    await ack();

    fs.readFile("modal.json", 'utf8', async (err, data) => {
        if (err) throw err;
        try {
            const modal = JSON.parse(data);
            trigger_id = command.trigger_id
            await app.client.views.open({
                trigger_id: trigger_id,
                view: modal
            });
        } catch (e) {
            console.log(e)
        }
    });
});

//create a function that removes everything in parentheses
function removeParentheses(str) {
    return str.replace(/\(.*?\)/g, '');
}

function startsWithString(str, arr) {
    return arr.filter(function(item) {
        let name = item.split(",")[0];
        return name.startsWith(str);
    });
}


app.view('modal', async ({ ack, body, view, client }) => {
    await ack();
    //console.log(view.state.values)
    var messageInput = view.state.values.message_input.plain_text_input_action.value

    //remove all tabs and split by new line
    var inputArray = messageInput.replace(/\t/g, '')
    inputArray = removeParentheses(inputArray)
    inputArray = inputArray.split('\n');

    //remove duplicates in input array
    inputArray = inputArray.filter(function (item, pos) {
        return inputArray.indexOf(item) == pos;
    })

    //gets all members in the workspace by reading ssimembers.csv and store the first column into an array
    var membersArray = fs.readFileSync('ssimembers.csv', 'utf8').split('\n');

    var userArray = []

    for (var i = 0; i < inputArray.length; i++) {
        classMemberName = inputArray[i]

        names = classMemberName.split(' ')
        firstName = names[0]

        var matches = startsWithString(firstName, membersArray)

        for (var j = 0; j < matches.length; j++){
            potentialSSIMatch = matches[j]
            userId = potentialSSIMatch.split(',')[1]
            potentialSSIMatch = potentialSSIMatch.split(',')[0]
            potentialSSIMatchNames = potentialSSIMatch.split(' ')
            console.log(potentialSSIMatchNames)

            //checks how many names in "names" variable match with the names in the potentialSSIMatchNames variable
            var count = 0;
            for (var k = 0; k < names.length; k++){
                if (potentialSSIMatchNames.includes(names[k])){
                    count += 1
                }
            }
            if(count >= 2){
                //remove new line from user id
                userId = userId.replace(/(\r\n|\n|\r)/gm, "");
                userArray.push(userId)
            }
        }

    }

    //remove duplicates in userArray
    userArray = userArray.filter(function (item, pos) {
        return userArray.indexOf(item) == pos;
    })

    var userArrayString = ""
    for (var i = 0; i < userArray.length; i++){
        userArrayString += "<@" + userArray[i] + "> "
    }

    //dm user with the list of potential matches
    await client.chat.postMessage({
        channel: body.user.id,
        text: "People in your class:\n" + userArrayString + "\n\n Consider making a channel for your class! the convention is #ssi-takes-[class name]. Or if it already exists, join it and add these members!"
    });

    //console.log(inputArray)

});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
