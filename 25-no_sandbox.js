const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const OpenAI = require("openai");
const os = require('os');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');  // npm install sharp
const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const archiver = require('archiver');
const unzipper = require('unzipper');
const mime = require('mime-types');
const { send } = require('process');
const path = require('path');



// Prerequisites
const ADMIN_PASSWORD = "078616"; // Replace with the actual admin password
const transferAccountDetails = `Bank: Commercial Bank\nAccount Name: M N F ILMA\nAccount Number: 86846841`;
let botAdminContactDetails = "ajoaibot@gmail.com";


const BotName = "AJO AI";
const mainDirName = "Files";
const mainDir = `./${mainDirName}`;
let login_ready_users = []; // Users ready to log in as admin 
let authorized_users = ['94762057788','94757067788']; // Users who are already logged in as admins
let current_bug_reporting = []; // Users currently reporting bugs
let API_KEYS_DIC = {};
let CURRENT_API_KEY = {};
let API_KEYS_TEXT_FILES = {"gpt4o-mini":`${mainDir}/gpt4o_api_keys.txt`, "groq":`${mainDir}/groq_api_keys.txt`}; //'deep-infra':"./deep_infra_api_keys.txt"
let OUR_MODEL_NAMES = ["gpt-4o-mini","llama-3.2-90b-vision-preview"]; // "llama-3.2-90b-vision-preview"
let BASE_URL_NAMES = ["https://models.inference.ai.azure.com",'https://api.groq.com/openai/v1']; // https://api.groq.com/openai/v1, https://api.deepinfra.com/v1/openai
let whisper_model_name = "whisper-large-v3";
let ALL_USERS_LIST = []; // List of All Users
let ALL_USERS_LIST_with_user_name = [];
let upgradeUsersPendingToSendImages = [];
let upgradeUsersPendingToSendImagesTimings = [];
let adminHandlingReciptApproval = {};
let upgrading_user_temp_admin = {};
let upgrading_details_given_by_admin = {};
let userUpgradingPrompts = {};
let userIntiatedPlan = {};
let user_payment_recieving_check = {};
let admin_iniated_to_send_all_users = {};
let admin_iniated_message = {};
let ALL_CHAT_HISTORY = {};
let adminInDeletingUser = {};
let adminInAddingAPIKeys = {};
let adminAddingAPIKeysType = {};
let adminInSendingMessageToOneUser = {};
let adminInSendingMessageToOneUserDetails = {};
let users_who_asked_to_send_as_image = {};
let isBotPaused = false;
let adminInIputingZIP = {};

const payment_receipt_details_storing_json_file_name = mainDir + '/User Receipts Details.json';
const users_wait_list_at_training_period_json_file_name = mainDir + '/User WaitList.json';

const allUserChatsDir = "./Files/chats"
const bug_reporter_text_path = mainDir + "/bug_reports.txt"; // Path to save bug reports
const DEEP_INFRA_API_keys_text_file = "./deep_infra_api_keys.txt";
const AllUsers_text_file = mainDir + "/all_users.txt";
const user_report_pdf_name = mainDir + "/User Report.pdf";
const ALL_USERS_LIST_with_user_name_txt_file = mainDir + "/all_user_with_name.txt";
let user_chat_history = {}; 
let activeMessages = {}; 
// File path to store the JSON
const UserManagerfilePath = mainDir + '/user_manager.json';

// Create primary folder
if (!fs.existsSync(mainDir)) {
    fs.mkdirSync(mainDir, { recursive: true });
}
if (!fs.existsSync(allUserChatsDir)) {
    fs.mkdirSync(allUserChatsDir, { recursive: true });
}

function welcome_message(user_name) {
    const welcomes_texts = [
        `🌟 Hi ${user_name}!\nWelcome to *${BotName}*, your AI buddy on WhatsApp! Let’s make life smarter and more exciting! 🚀`,
    ];

    return welcomes_texts[Math.floor(Math.random() * welcomes_texts.length)];
}



///// STOPPING SCHEDULES //////////////////////////////////////////////////////////////////////////////
process.on('SIGINT', () => {
    console.log('Gracefully shutting down...');
    schedule.gracefulShutdown().then(() => {
        console.log('All scheduled jobs stopped.');
        process.exit(0); // Exit process
    });
});

process.on('SIGTERM', () => {
    console.log('Gracefully shutting down...');
    schedule.gracefulShutdown().then(() => {
        console.log('All scheduled jobs stopped.');
        process.exit(0);
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////

const API_KEYS_ID = Object.keys(API_KEYS_TEXT_FILES);
API_KEYS_ID.forEach(apiId => {
    try {
        // Ensure the file exists, create an empty one if not
        if (!fs.existsSync(API_KEYS_TEXT_FILES[apiId])) {
            fs.writeFileSync(API_KEYS_TEXT_FILES[apiId], '');
        }

        const API_KEYS_TEMP_LIST_STR = fs.readFileSync(API_KEYS_TEXT_FILES[apiId], 'utf8');
        API_KEYS_DIC[apiId] = API_KEYS_TEMP_LIST_STR.split('\n').filter(line => line.trim() !== '');

        if (API_KEYS_DIC[apiId].length > 0) {
            CURRENT_API_KEY[apiId] = API_KEYS_DIC[apiId][0];
            console.log(`${API_KEYS_DIC[apiId].length} keys found for ${apiId}, using: ${CURRENT_API_KEY[apiId]}..`);
        } else {
            console.warn(`No API keys found for ${apiId}. You can add keys later.`);
        }
    } catch (error) {
        console.error(`Error handling API keys for ${apiId}:`, error.message);
    }
});


try {
    const ALL_USERS_LIST_STR = fs.readFileSync(AllUsers_text_file, 'utf8');
    ALL_USERS_LIST = ALL_USERS_LIST_STR.split('\n').filter(line => line.trim() !== '');
        if (ALL_USERS_LIST.length > 0) {
            console.log(`${ALL_USERS_LIST.length} pre users found.`);
        }
    const ALL_USERS_LIST_with_user_name_STR = fs.readFileSync(ALL_USERS_LIST_with_user_name_txt_file, 'utf8');
    ALL_USERS_LIST_with_user_name = ALL_USERS_LIST_with_user_name_STR.split('\n').filter(line => line.trim() !== '');
} catch (error) {
    try {
        fs.appendFileSync(AllUsers_text_file, "", 'utf8');
        console.log("No All Users text file found, hence created!");
    } catch (error) {
        console.error("Error occured in creating All Users text file:", error);
        process.exit(1); // Exit the process
    }
}

for (const user_id_temp of ALL_USERS_LIST) {
    activeMessages[user_id_temp] = 0;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////
function startup_runners() {
    const API_KEYS_ID = Object.keys(API_KEYS_TEXT_FILES);
    API_KEYS_ID.forEach(apiId => {
        try {
            // Ensure the file exists, create an empty one if not
            if (!fs.existsSync(API_KEYS_TEXT_FILES[apiId])) {
                fs.writeFileSync(API_KEYS_TEXT_FILES[apiId], '');
            }

            const API_KEYS_TEMP_LIST_STR = fs.readFileSync(API_KEYS_TEXT_FILES[apiId], 'utf8');
            API_KEYS_DIC[apiId] = API_KEYS_TEMP_LIST_STR.split('\n').filter(line => line.trim() !== '');

            if (API_KEYS_DIC[apiId].length > 0) {
                CURRENT_API_KEY[apiId] = API_KEYS_DIC[apiId][0];
                console.log(`${API_KEYS_DIC[apiId].length} keys found for ${apiId}, using: ${CURRENT_API_KEY[apiId]}..`);
            } else {
                console.warn(`No API keys found for ${apiId}. You can add keys later.`);
            }
        } catch (error) {
            console.error(`Error handling API keys for ${apiId}:`, error.message);
        }
    });


    try {
        const ALL_USERS_LIST_STR = fs.readFileSync(AllUsers_text_file, 'utf8');
        ALL_USERS_LIST = ALL_USERS_LIST_STR.split('\n').filter(line => line.trim() !== '');
            if (ALL_USERS_LIST.length > 0) {
                console.log(`${ALL_USERS_LIST.length} pre users found.`);
            }
        const ALL_USERS_LIST_with_user_name_STR = fs.readFileSync(ALL_USERS_LIST_with_user_name_txt_file, 'utf8');
        ALL_USERS_LIST_with_user_name = ALL_USERS_LIST_with_user_name_STR.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        try {
            fs.appendFileSync(AllUsers_text_file, "", 'utf8');
            console.log("No All Users text file found, hence created!");
        } catch (error) {
            console.error("Error occured in creating All Users text file:", error);
            process.exit(1); // Exit the process
        }
    }

    for (const user_id_temp of ALL_USERS_LIST) {
        activeMessages[user_id_temp] = 0;
    }

    //// LOAD JSONS /////////////////////
    let payment_recipt_sent_by_users = load_json_to_dic(payment_receipt_details_storing_json_file_name);
    let users_wait_list_at_training_period = load_json_to_dic(users_wait_list_at_training_period_json_file_name);
    /////////////////////////////////////

    user_manager = load_user_manager(); 
    chatHistory = createLimitedList();
    return user_manager, chatHistory, payment_recipt_sent_by_users, users_wait_list_at_training_period
}

function updateApiTxt() {
    try {
        API_KEYS_ID.forEach(apiId => {
            const content = API_KEYS_DIC[apiId].join('\n');
            fs.writeFileSync(API_KEYS_TEXT_FILES[apiId], content, 'utf8');
        })
        console.log("API keys updated successfully.");
    } catch (error) {
        console.error("Error updating API keys file:", error);
    }
}

function update_ALL_USERS_txt() {
    try {
        const content = ALL_USERS_LIST.join('\n');
        fs.writeFileSync(AllUsers_text_file, content, 'utf8');
        console.log("All Users text file updated successfully.");
    } catch (error) {
        console.error("Error updating All Users text file:", error);
    }
}

function update_ALL_USERS_LIST_with_user_name_txt() {  //ALL_USERS_LIST_with_user_name
    try {
        const content = ALL_USERS_LIST_with_user_name.join('\n');
        fs.writeFileSync(ALL_USERS_LIST_with_user_name_txt_file, content, 'utf8');
        //console.log("All Users with names text file updated successfully.");
    } catch (error) {
        //console.error("Error updating All Users with names text file:", error);
    }
}
/////////////

/// PLANS //////////////////////////////////////////////////////////////////////////////////////////////////

PLANS = {
    "free-plan": {
        "plan_name": 'Free Plan',
        "messages": 10,
        "chats": 50,
        "image_analysis": 5,
        "price_LKR": "Free",
        "price_USD": "Free",
        "duration": 365,
        "easy_duration": "1 Year",
        "is_paid": false,
        "premiuim": false
    },
    "week-plus": {
        "plan_name": 'Week Plus Plan',
        "messages": 50,
        "chats": 100,
        "image_analysis": 20,
        "price_LKR": "299",
        "price_USD": "1",
        "duration": 7,
        "easy_duration": "1 Week",
        "is_paid": true,
        "premiuim": false
    },
    "month-plus": {
        "plan_name": 'Month Plus Plan',
        "messages": 50,
        "chats": 100,
        "image_analysis": 20,
        "price_LKR": "999",
        "price_USD": "3.5",
        "duration": 30,
        "easy_duration": "1 Month",
        "is_paid": true,
        "premiuim": false
    },
    "week-premium": {
        "plan_name": 'Week Premium Plan',
        "messages": 200,
        "chats": 1000,
        "image_analysis": 100,
        "price_LKR": "899",
        "price_USD": "3",
        "duration": 7,
        "easy_duration": "1 Week",
        "is_paid": true,
        "premiuim": true
    },
    "month-premium": {
        "plan_name": 'Month Premium Plan',
        "messages": 200,
        "chats": 1000,
        "image_analysis": 100,
        "price_LKR": "3199",
        "price_USD": "10",
        "duration": 30,
        "easy_duration": "1 Month",
        "is_paid": true,
        "premiuim": true
    }
}

function give_currency_type(user_id) {
    if (user_id.startsWith("94")) {
        return "LKR"
    } else {
        return "USD"
    }
}

function is_local_user(user_id) {
    if (user_id.startsWith("94")) {
        return true
    } else {
        return false
    }
}

//////
function upgrading_limit_reaching_text(user_id) {
    const upgrading_limit_reaching__return_text = ` Ready to take things to the next level and unleash the full potential of our models 🚀

    Here’s what’s waiting for you:
    ✨ More messages – Stay connected with higher limits!
    ✨ More chats – Get even more interactive and productive.
    ✨ More Image Analysis - Unlock more Image Analysis per Day.
    ✨ Exclusive features – Be the first one to explore new fatures.

    Our plans start at just ${give_currency_type(user_id)} ${is_local_user(user_id) ? `${PLANS['week-plus']['price_LKR']}` : `${PLANS['week-plus']['price_USD']}`} – an unbeatable offer for unlimited possibilities! ✨

    Reply *UPGRADE* or *Up* now to explore all the options and find the perfect plan for you. Let’s keep the conversation going! We’re excited to support you on your journey!`;
    
    return upgrading_limit_reaching__return_text;
}

//// PLAN Expiry Handling ///////////////////////////////////////////////////////////////////////////////////// 
function isPlanExpired() {
    const currentTime = new Date(getDateTime()); // Current time based on your `getDateTime` utility

    for (const user_id in user_manager) {
        const user = user_manager[user_id];
        if (!user || user.user_plan === 'free-plan' || !user.activation_date) continue;

        const activationDate = new Date(user.activation_date);
        const duration = PLANS[user.user_plan]?.duration || 0;
        const expiryDate = new Date(activationDate);
        expiryDate.setDate(activationDate.getDate() + duration);

        const timeDifference = expiryDate - currentTime;

        if (timeDifference <= 0) {
            // Notify the user about plan expiry
            send_message(user_id, `🚨 Your plan has expired! You’ve been downgraded to the Free Plan. Upgrade again to continue enjoying premium features.`);
            
            // Downgrade the user's plan to "free-plan"
            user_manager[user_id]['user_plan'] = 'free-plan';
            user_manager[user_id]['messages'] = 0;
            user_manager[user_id]['chats'] = 0;
            user_manager[user_id]['image_analysis'] = 0;
            user_manager[user_id]['activation_date'] = getDateTime(); // Reset activation date
            user_manager[user_id]["notified_one_day_prior"] = false;
            user_manager[user_id]["notified_one_hour_prior"] = false;
            save_user_manager(user_manager);
        }
    }
}

function notifyBeforeExpiry() {
    const currentTime = new Date(getDateTime()); // Current time based on your `getDateTime` utility

    for (const user_id in user_manager) {
        const user = user_manager[user_id];
        if (!user || user.user_plan === 'free-plan' || !user.activation_date) continue;

        const activationDate = new Date(user.activation_date);
        const duration = PLANS[user.user_plan]?.duration || 0;
        const expiryDate = new Date(activationDate);
        expiryDate.setDate(activationDate.getDate() + duration);

        const timeDifference = expiryDate - currentTime;

        // Notify one day prior
        if (timeDifference > 0 && timeDifference <= 24 * 60 * 60 * 1000 && !user.notified_one_day_prior) {
            send_message(user_id, `⚠️ Reminder: Your plan will expire in less than 24 hours. Upgrade now to avoid service interruption!`);
            user_manager[user_id].notified_one_day_prior = true;
        }

        // Notify one hour prior
        if (timeDifference > 0 && timeDifference <= 60 * 60 * 1000 && !user.notified_one_hour_prior) {
            send_message(user_id, `⏳ Reminder: Your plan will expire in less than 1 hour. Upgrade now to continue enjoying premium features!`);
            user_manager[user_id].notified_one_hour_prior = true;
        }

        // Reset notifications if the plan is renewed
        if (timeDifference <= 0) {
            user_manager[user_id].notified_one_day_prior = false;
            user_manager[user_id].notified_one_hour_prior = false;
        }
    }

    save_user_manager(user_manager); // Save changes persistently
}


// Runs every 1 minute
schedule.scheduleJob('*/5 * * * *', () => {
    save_user_manager(user_manager);
    isPlanExpired();
    notifyBeforeExpiry();
    saveAllChatsToFile(ALL_CHAT_HISTORY);
    save_user_manager(user_manager);
});

// Runs every 1 hour
schedule.scheduleJob('*/60 * * * *', () => {
    check_for_pending_receipts();
});

// Schedule job to run at 12:00 AM every day on SriLankan Time
schedule.scheduleJob('18 30 * * *', () => {
    resetDailyLimits('auto');
    save_user_manager(user_manager);
});

function check_for_pending_receipts() {
    const users_id_list_temp = Object.keys(payment_recipt_sent_by_users);

    if (users_id_list_temp.length !== 0) {
        sendToAllAdmins(`⚠️ You have ${users_id_list_temp.length} pending receipts awaiting review. \nType *RECEIPTSTOREFER* to proceed with the review.`);
    }
}

/// DATABASE //////////////////////////////////////////////////////////////////////////////////////////////////
// Function to save the user_manager dictionary
function save_user_manager(userManager) {
    try {
        fs.writeFileSync(UserManagerfilePath, JSON.stringify(userManager, null, 2), 'utf8');
        //console.log("User manager saved");
    } catch (error) {
        console.error('Error saving user manager:', error);
    }
}

// Function to load the user_manager dictionary
function load_user_manager() {
    try {
        if (fs.existsSync(UserManagerfilePath)) {
            const data = fs.readFileSync(UserManagerfilePath, 'utf8');
            console.log('User manager loaded successfully!');
            return JSON.parse(data);
        } else {
            console.log('No saved user manager found. Returning an empty object.');
            return {};
        }
    } catch (error) {
        console.error('No datas found in user manager', error);
        return {};
    }
}



function save_dic_to_json(dic_file_name,dic_file_path) {
    try {
        fs.writeFileSync(dic_file_path, JSON.stringify(dic_file_name, null, 2), 'utf8');
        console.log(`${dic_file_name} saved to ${dic_file_path} successfully!`);
    } catch (error) {
        console.error(`Error saving ${dic_file_name} to ${dic_file_path}:`, error);
    }
}

// Function to load the user_manager dictionary
function load_json_to_dic(dic_file_path) {
    try {
        if (fs.existsSync(dic_file_path)) {
            const data = fs.readFileSync(dic_file_path, 'utf8');
            console.log(`Dictionary loaded from ${dic_file_path} successfully!`);
            return JSON.parse(data);
        } else {
            console.log(`No saved Dictionary named ${dic_file_path} found! Returning an empty object.`);
            return {};
        }
    } catch (error) {
        console.error(`No datas found in ${dic_file_path}: `, error);
        return {};
    }
}

// Function to reset daily limits for all users
function resetDailyLimits(whois) {
    try {
        // Loop through all users in the user_manager
        for (const user_id in user_manager) {
            const user = user_manager[user_id];
            if (user) {
                user.messages = 0; // Reset message count
                user.chats = 0; // Reset chat count
                user.image_analysis = 0; // Reset image analysis count
            }
        }

        // Save the updated user manager to persist changes
        save_user_manager(user_manager);
        if (whois === 'auto') {
            sendToAllAdmins(`Daily limits reseted Automatically!\nTime: ${getDateTime()}`);
        } else {
            sendToAllAdmins(`Daily limits reseted manually by the Admin ${whois}!\nTime: ${getDateTime()}`);
        }
    } catch (error) {
        console.error("Error resetting daily limits:", error);
    }
}

// Function to create a PDF page
function createPDFPage(doc, data, pageNumber, pageWidth, pageHeight) {
    // Title
    doc.font("Helvetica-Bold").fontSize(16);
    doc.text("User Data Report", (pageWidth / 2) - 70, 25);
  
    // Date and Time
    const currentTime = new Date().toISOString().replace("T", " ").slice(0, 19);
    doc.font("Helvetica").fontSize(8);
    doc.text(`Generated: ${getDateTime()}`, pageWidth - 165, 10);
  
    // Page Number
    doc.font("Helvetica").fontSize(8);
    doc.text(`Page ${pageNumber}`, pageWidth - 570, pageHeight - 783);
  
    // Table Headers
    const headers = [
      "No.",
      "Number",
      "Username",
      "User Plan",
      "Messages",
      "Chats",
      "Img Analysis",
      "Activated Date",
    ];
    const headerXPositions = [-25, 25, 105, 180, 245, 295, 355, 465];
  
    doc.font("Helvetica-Bold").fontSize(11);
    let yPosition = 64; // Start height for headers
    headers.forEach((header, index) => {
      doc.text(header, headerXPositions[index], yPosition, { width: 120, align: "center" });
    });
  
    // Table Rows
    doc.font("Helvetica").fontSize(10);
    yPosition += 23; // Adjust for table row space
    const rowHeight = 17;
    const startingRowNumber = 1 + (pageNumber - 1) * 40;
  
    let rowNumber = startingRowNumber;
  
    for (let idx = (pageNumber - 1) * 40; idx < Math.min(pageNumber * 40, Object.keys(data).length); idx++) {
      const userId = Object.keys(data)[idx];
      const userData = data[userId];

      
  
      // Alternate row colors (light gray for even rows)
      if (rowNumber % 2 === 1) {
        doc.rect(20, yPosition - 4, pageWidth - 40, rowHeight).fill("#DDDDDD").fillColor("black");
      }

      // Alternate row colors (light gray for even rows)
      if (userData['user_plan'] !== 'free-plan') {
        doc.rect(20, yPosition - 4, pageWidth - 40, rowHeight).fill("#F1EACE").fillColor("black");
      }

      let user_name_display = userData.user_name;
      if (userData.user_name.length>15) {
        user_name_display = userData.user_name.slice(0, 15)+"..";
      }
  
      const row = [
        String(rowNumber),
        userId,
        user_name_display,
        userData.user_plan,
        String(userData.messages),
        String(userData.chats),
        String(userData.image_analysis),
        String(userData.activation_date),
      ];
  
      row.forEach((cell, index) => {
        doc.text(cell, headerXPositions[index], yPosition, { width: 120, align: "center" });
      });
  
      yPosition += rowHeight;
      rowNumber += 1;
    }
  
    // Reset fill color to black
    doc.fillColor("black");
  }
  
  // Create the PDF
function createPDF(jsonData) {
    const PDFfilePath = user_report_pdf_name;
    const doc = new PDFDocument({ size: "letter", margin: 30 });
    const writeStream = fs.createWriteStream(PDFfilePath);
    doc.pipe(writeStream);
  
    const pageWidth = 612; // Width for Letter size in points
    const pageHeight = 792; // Height for Letter size in points
    const rowsPerPage = 40;
    const totalPages = Math.ceil(Object.keys(jsonData).length / rowsPerPage);
  
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      createPDFPage(doc, jsonData, pageNumber, pageWidth, pageHeight);
      if (pageNumber < totalPages) {
        doc.addPage();
      }
    }
  
    doc.end();
    //console.log(`PDF created successfully: ${PDFfilePath}`);
  }

//// LOAD JSONS /////////////////////
let payment_recipt_sent_by_users = load_json_to_dic(payment_receipt_details_storing_json_file_name);
let users_wait_list_at_training_period = load_json_to_dic(users_wait_list_at_training_period_json_file_name);
/////////////////////////////////////

let user_manager = load_user_manager(); 

function update_user_manager_dictionary(user_id, user_name) {
    user_manager[user_id] = {
        user_name: user_name,
        user_plan: 'free-plan',
        model: 0,
        activation_date: getDateTime(),
        messages: 0,
        chats: 0,
        image_analysis: 0,
        notified_one_day_prior: false, // Initialize
        notified_one_hour_prior: false // Initialize
    };
    save_user_manager(user_manager);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

let chatHistory = createLimitedList();

////////////////////
// WhatsApp Web.js setup
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Add no-sandbox flags
    },
  });

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log(`${BotName} is ready!`);
});

client.on('message', async (message) => {
    const user_id = message.from.split('@')[0];
    //return ""; // Remove first 2 slashes of this line if qutoed msg error continously occurs
    try {
        const aiResponse = await handle_message(message);

        if (aiResponse) {
            await message.reply(aiResponse);
        } else if (aiResponse === "") {
            // DO nothing
        }
        else {
            console.warn("AI response was empty or undefined.");
            await message.reply("Sorry, I couldn't process your request. Please try again later. If the issue persists, feel free to report it.");
        }
    } catch (error) {
        console.error("Error with DeepInfra or WhatsApp API:", error);
        await message.reply("Sorry, I couldn't process your request. Please try again later. If the issue persists, feel free to report it.");
    }
    activeMessages[user_id] -= 1;
});

client.initialize();

async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000)); // Convert seconds to milliseconds
  }

function encodeImageToBase64_original(imagePath) {
    const data = fs.readFileSync(imagePath);
    return data.toString('base64');
}

// Function to encode and compress image as Base64
async function encodeImageToBase64(imagePath, maxWidth = 500, maxHeight = 500, quality = 70) {
    try {
        const compressedImageBuffer = await sharp(imagePath)
            .resize({
                width: maxWidth,
                height: maxHeight,
                fit: "inside", // Maintain aspect ratio
            })
            .jpeg({ quality }) // Compress to JPEG
            .toBuffer();

        let base64String = compressedImageBuffer.toString("base64");

        // Ensure correct padding for Base64
        const remainder = base64String.length % 4;
        if (remainder > 0) {
            base64String += "=".repeat(4 - remainder);
        }

        return base64String;
    } catch (error) {
        sendToAllAdmins(`🚨 *Error Alert!* 🚨\nAn error occured while encoding image to base 64 version on ${getDateTime()}. Please Inversitgate\n\n*Error Message:* ${error}`)
    }
}

async function check_for_voice_messages(user_id,user_name,user_message,message) {
    if (message.hasMedia && (message.type === 'ptt')) {
        try {
            const media = await message.downloadMedia();
            const path = `${mainDir}/voices/${user_id}_voices/${message.id.id}.${media.mimetype.split('/')[1].split(';')[0]}`;
            let caption = message.body?.trim();
            const dir = `${mainDir}/voices/${user_id}_voices`;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(path, buffer);
            return await getAudioText(path);   
        } catch (error) {
            sendToAllAdmins(`🚨 *Error Alert!* 🚨\nAn error occured in the function _check for voice messages_ on ${getDateTime()} while the user ${user_id} using it for analysing audio message. Please Inversitgate\n\n*Error Message:* ${error}`)
        }   
    } else {
        return "NONE"
    }
}

async function check_for_any_files(user_id, user_name, user_message, message) {
    if (message.hasMedia && (message.type === 'document')) { // message._data.filename.endsWith('.zip')
        try {
            if (message._data.filename.endsWith('.zip') && adminInIputingZIP[user_id] === "1") {
                return await handleZipSavingAndExtracting(user_id,message);
            }
            const media = await message.downloadMedia();
            const path = `${mainDir}/User_Files/${user_id}_files/${message.id.id}_${message._data.filename}`;
            console.log(`Media detected: ${message.hasMedia}, Type: ${message.type}, Filename: ${message.filename}`);

            const dir = `${mainDir}/User_Files/${user_id}_files`;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(path, buffer);
            return "Currently other files types not supported";
        } catch (error) {
            sendToAllAdmins(`🚨 *Error Alert!* 🚨\nAn error occurred in the function _check_for_any_files_ on ${getDateTime()} while the user ${user_id} was sending a file. Please investigate.\n\n*Error Message:* ${error}`);
            return "Currently other files types not supported"
        }
    } else {
        return "NONE";
    }
}


async function check_for_images(user_id,user_name,user_message,message) {
    if (message.hasMedia && message.type === 'image') {
        try {
            
            if (upgradeUsersPendingToSendImages.includes(user_id)) {
                const media = await message.downloadMedia();
                const path = `${mainDir}/images/${user_id}_images_receipt/${message.id.id}.${media.mimetype.split('/')[1]}`;
                
                // Ensure the directory exists
                let caption = message.body?.trim();
                const dir = `${mainDir}/images/${user_id}_images_receipt`;
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            
                // Write the media file
                await sleep(0.5);
                fs.writeFileSync(path, media.data, 'base64');
                console.log(`Media sent by ${user_id} saved to ${path}`);
                await sleep(0.5);
                send_message(user_id, "✅ We’ve received your payment proof! Our team will review it shortly. \nYou’ll receive a confirmation within 3 hours. \n\nThank you for your patience!");
                payment_recipt_sent_by_users[user_id] = {};
                payment_recipt_sent_by_users[user_id]['plan'] = userIntiatedPlan[user_id];
                payment_recipt_sent_by_users[user_id]['img_path'] = path;
                payment_recipt_sent_by_users[user_id]['time'] = getDateTime();
                upgradeUsersPendingToSendImages = upgradeUsersPendingToSendImages.filter(id => id !== user_id);
                upgradeUsersPendingToSendImagesTimings = upgradeUsersPendingToSendImagesTimings.filter(id => id !== user_id);
                save_dic_to_json(payment_recipt_sent_by_users,payment_receipt_details_storing_json_file_name);  // ${give_currency_type(user_id)} is_local_user(user_id) ? 'price_LKR' : 'price_USD'
                for (const admin_id_temp of authorized_users) {
                    await sleep(1);
                    send_image(admin_id_temp, path, `⚠️ Proof of payment sent by ${user_id}\nPlan: *${PLANS[userIntiatedPlan[user_id]]['plan_name']}*\nPrice: *${give_currency_type(user_id)} ${PLANS[userIntiatedPlan[user_id]][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}*\nSent On: ${getDateTime()}\n\nPlease review the payment as soon as possible. (Sent to All Admins)`);
                    delete userIntiatedPlan[user_id];
                }
                return "RECEIPT"
            } else if (current_bug_reporting.includes(user_id)) {
                const media = await message.downloadMedia();
                const path = `${mainDir}/images/${user_id}_images_bugreport/${message.id.id}.${media.mimetype.split('/')[1]}`;
                
                // Ensure the directory exists
                let caption = message.body?.trim();
                const dir = `${mainDir}/images/${user_id}_images_bugreport`;
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            
                // Write the media file
                await sleep(0.5);
                fs.writeFileSync(path, media.data, 'base64');
                console.log(`Media sent by ${user_id} saved to ${path}`);
                for (const admin_id_temp of authorized_users) {
                    await sleep(0.5);
                    if (caption) {
                        send_image(
                            admin_id_temp,
                            path,
                            `🚨 *Bug Report Alert!* 🚨\n\n🛠️ *Reported By:* ${user_id} (${user_name})\n📝 *Bug Details:* ${caption}\n📅 *Reported On:* ${getDateTime()}\n\n✅ *Status:* Sent to All Admins.`
                        );                    
                    } else {
                            send_image(
                                admin_id_temp,
                                path,
                                `🚨 *Bug Report Alert!* 🚨\n\n🛠️ *Reported By:* ${user_id} (${user_name})\n📅 *Reported On:* ${getDateTime()}\n\n✅ *Status:* Sent to All Admins.`
                            );                    }
                }
                if (!caption) {
                    return "Image Report"
                } else {
                    return caption
                }
            } else {
                let user_plan_tariff = PLANS[user_manager[user_id]['user_plan']];
                let user_stats = user_manager[user_id];
                if (user_stats['image_analysis'] >= user_plan_tariff['image_analysis']) {
                    send_message(user_id, `⚠️ You have reached your Image Analysis limits for today. \nTo unlock more, try *UPGRADE* or *Up* your plan for additional Image Analyses per day.`);
                    await sleep(1);
                    send_message(user_id,upgrading_limit_reaching_text(user_id));
                    return "ERROR"
                }

                const media = await message.downloadMedia();
                const path = `${mainDir}/images/${user_id}_images/${message.id.id}.${media.mimetype.split('/')[1]}`;
                
                // Ensure the directory exists
                let caption = message.body?.trim();
                const dir = `${mainDir}/images/${user_id}_images`;
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            
                // Write the media file
                await sleep(0.5);
                fs.writeFileSync(path, media.data, 'base64');
                console.log(`Media sent by ${user_id} saved to ${path}`);
                await sleep(0.5);

                if (!user_chat_history[user_id]) {
                    user_chat_history[user_id] = [];
                }

                
                //send_message(user_id,"Image analysis not supported yet, Stay tuned for updates!")
                //return "ERROR"
                send_message(user_id,"Analyzing Image...🔍");
                if (!caption) {
                    caption = "Whats here?";
                }
                const base64Image = await encodeImageToBase64(path);
                await sleep(0.5);
                const my_img = `data:image/jpeg;base64,${base64Image}`;
                user_chat_history[user_id].push({ role: "user", content: [{ type: "text", text: caption },{type: "image_url", image_url: {url: my_img,"detail": "low"}}] });
                user_manager[user_id]['image_analysis'] += 1;
                await sleep(0.5);
                return "IMAGEANALYSIS_PROGRAM"
                //send_message(user_id,"Image analysis not supported yet, Stay tuned for updates!")
                
            }
            
            
        } catch (error) {
            console.error('Failed to save media:', error);
            send_message(user_id, "❌ Oops! I was unable to process the image. Please try again in a moment! 😔");
            return "ERROR"
        }
        
    } else {
        return "NONE"
    }
}

async function handle_message(message) {
    try {
        let user_message = message.body?.trim();
        const user_id = message.from.split('@')[0];
        const contact = await client.getContactById(message.from);
        const user_name = contact.pushname || "Unknown User"; // Get the user's name or default to "Unknown User" if not available
        let repliedMessageContent = "None";

        if (isBotPaused) {
            if (authorized_users.includes(user_id)) {
                send_message(user_id,`⚠️ Bot is paused, replying only for ADMINS!`);
                await sleep(1);
            } else {
                return "🛠️ Bot is currently under maintenance. Please try again in a few seconds. T hank you for your patience!"
            }
        }

        if (!ALL_USERS_LIST.includes(user_id)) {
            ALL_USERS_LIST.push(user_id);
            activeMessages[user_id] = 0;
            ALL_USERS_LIST_with_user_name.push(`${user_id} - ${user_name}`);
            update_ALL_USERS_txt();
            update_ALL_USERS_LIST_with_user_name_txt();
            update_user_manager_dictionary(user_id,user_name);
            send_message(user_id,welcome_message(user_name));
            await sleep(1.5);
            send_message(user_id,"👉 Type COMMANDS or C to discover all the cool things I can do. Let’s get started! 🚀")
        }

        if (users_who_asked_to_send_as_image[user_id]) {
            if (['yes', 'yeah', 'yup', 'y', 'ye'].includes(user_message.toLowerCase())) {
                try {
                    const file_name = `${mainDir}/htmls/${user_id}_htmls/${users_who_asked_to_send_as_image[user_id].slice(0, 10)}.html`;
                    const dir = `${mainDir}/htmls/${user_id}_htmls`;
        
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
        
                    let output_generated_1 = generateHtmlFromLatex(users_who_asked_to_send_as_image[user_id], file_name);
                    await sleep(0.5);
                    if (output_generated_1 === "ERROR") {
                        return "Oops! An error occurred while generating your file. Please try again later.";
                    }
                    await send_file(user_id, file_name);
                    return "";
                } catch (error) {
                    console.error("Error processing file:", error);
                    return "😞 Oops! An error occurred while generating your file. Please try again later.";
                } finally {
                    delete users_who_asked_to_send_as_image[user_id];
                }
            } else {
                delete users_who_asked_to_send_as_image[user_id];
            }
        }
        


        // Check if the message is a reply to an earlier message
        if (message.hasQuotedMsg) {
            try {
                if (authorized_users.includes(user_id)) {
                    const quotedMessage = await message.getQuotedMessage(); // Fetch the quoted message
                    repliedMessageContent = quotedMessage.body; // Get the content of the quoted message
                    if (repliedMessageContent.startsWith("⚠️ Proof of payment sent by")) {
                        const userIdToBePromoted = repliedMessageContent.split("\n")[1];
                        if (payment_recipt_sent_by_users[userIdToBePromoted]) {
                            let text3 = `🎉 *User Promotion Details* 🎉\n\nUser: ${userIdToBePromoted}\nPlan to be upgraded: *${payment_recipt_sent_by_users[userIdToBePromoted]['plan']}*\nPrice: *${give_currency_type(user_id)} ${PLANS[payment_recipt_sent_by_users[userIdToBePromoted]['plan']][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}*\nSent On: ${payment_recipt_sent_by_users[userIdToBePromoted]['time']}`;
                            send_message(user_id, `${text3}\n\n🔑 *Current Plan:* ${user_manager[userIdToBePromoted]['user_plan']}`);
                            await sleep(0.5);
                            adminHandlingReciptApproval[user_id] = "11";
                            if (!upgrading_details_given_by_admin[user_id]) {
                                upgrading_details_given_by_admin[user_id] = [];
                            }
                            upgrading_details_given_by_admin[user_id].push(userIdToBePromoted);
                            upgrading_details_given_by_admin[user_id].push(payment_recipt_sent_by_users[userIdToBePromoted]['plan']);
                            return "Do you like to approve this user (y/n)?"
                        } else {
                            return `⚠️ This receipt has already been handled!`;
                        }
                    } else if (repliedMessageContent.startsWith("🚨 *Bug Report Alert!* 🚨")) {
                        try {
                            // Find the starting index of "Reported By:"
                            let startIndex = repliedMessageContent.indexOf("Reported By:") + "Reported By:".length + 2; // +1 for the space after ":"

                            // Extract the next 11 characters (the phone number)
                            let user_number = repliedMessageContent.slice(startIndex, startIndex + 11);
                            console.log(`caught user number: '${user_number}'`);
                            if (['yes','yeah','yup','y','ye'].includes(user_message.toLowerCase())) {
                                sendBugReportAppreciation(user_number);
                                return `🎉 User ${user_number} has been awarded *5 additional messages* with the 4o model for their bug report! 🙌`;
                            }
                        } catch (error) {
                            console.log(`Error ${error}`);
                            return `Error Occured in Approving Bug Report\nError ${error}`
                        }

                    }
                    
                }
            } catch (error) {
                console.log(`An Error Occured with Quoted Message`);
                return ""
            }
            //console.log(`User replied to an earlier message: ${repliedMessageContent}`);
        }

        let voice_verification = await check_for_voice_messages(user_id,user_name,user_message,message);
        let file_verification = await check_for_any_files(user_id,user_name,user_message,message);
        if (file_verification !== "NONE") {
            return file_verification;
        }
        
        if (voice_verification === "NONE") {

        } else if (voice_verification === "ERROR") {
            return ""
        } else {
            user_message =  voice_verification;
        }

        let images_verification = await check_for_images(user_id,user_name,user_message,message);
        if (images_verification === "RECEIPT") {
            return ""
        } else if (images_verification === "ERROR") {
            return ""
        } else if (images_verification === "NONE") {

        } else {
            user_message = images_verification;
        }
        // Save last 50 chats here
        chatHistory.append([getDateTime(),user_id,user_message]);

        if (adminInDeletingUser[user_id]) {
            if (user_message.length === 11 && user_message.startsWith("94")) {
                if (ALL_USERS_LIST.includes(user_message)) {
                    ALL_USERS_LIST = ALL_USERS_LIST.filter(id => id !== user_message);
                    delete adminInDeletingUser[user_id];
                    return `${user_message} removed successfully!`
                } else {
                    delete adminInDeletingUser[user_id];
                    return `⚠️ Above user not found!`
                }
            } else {
                delete adminInDeletingUser[user_id];
                return "❌ Invalid Number!"
            }
        }

        if (adminInSendingMessageToOneUser[user_id]) {
            if (adminInSendingMessageToOneUser[user_id] === "1") {
                if (ALL_USERS_LIST.includes(user_message)) {
                    adminInSendingMessageToOneUser[user_id] = "11";
                    adminInSendingMessageToOneUserDetails[user_id] = [];
                    adminInSendingMessageToOneUserDetails[user_id].push(user_message);
                    return `💬 Please type the message need to be sent:`;
                } else {
                    delete adminInSendingMessageToOneUser[user_id];
                    return `⚠️ User number ${user_message} not in ALL USERS LIST`;
                }
            } else if (adminInSendingMessageToOneUser[user_id] === "11") {
                if (user_message) {
                    await sleep(0.5);
                    adminInSendingMessageToOneUserDetails[user_id].push(user_message);
                    send_message(user_id,`Message to be sent👇\n\n${user_message}`);
                    await sleep(0.5);
                    adminInSendingMessageToOneUser[user_id] = "111";
                    return `Are you sure to send this to the user ${adminInSendingMessageToOneUserDetails[user_id][0]} (y/n)?`;
                } else {
                    return `⚠️ I received an empty message\nPlease type in the message again!`;
                }
            } else if (adminInSendingMessageToOneUser[user_id] === "111") {

                if (user_message.toLowerCase() === "yes" || user_message.toLowerCase() === "y") {
                    try {
                        await sleep(0.5);
                        send_message(adminInSendingMessageToOneUserDetails[user_id][0],adminInSendingMessageToOneUserDetails[user_id][1]);
                        await sleep(1);
                        send_message(user_id, `✅ Message sent to user`);
                    } catch (error) {
                        await sleep(1);
                        sendToAllAdmins(`❌ An error occured while the admin ${user_id} tried to send message to the user ${adminInSendingMessageToOneUserDetails[user_id][0]}!`);
                    }
                }
                delete adminInSendingMessageToOneUser[user_id];
                delete adminInSendingMessageToOneUserDetails[user_id];
                return ""
            }
        }

        if (adminInAddingAPIKeys[user_id]) {
            if (user_message.toLowerCase() === "cancel") {
                delete adminInAddingAPIKeys[user_id];
                return "❌ API key addition has been aborted!";
            }
            if (adminInAddingAPIKeys[user_id] === "1") {
                if (Number.isInteger(Number(user_message))) {
                    if (Number(user_message) <= API_KEYS_ID.length && Number(user_message) > 0) {
                        let user_index = Number(user_message)-1;
                        adminInAddingAPIKeys[user_id] = "11";
                        adminAddingAPIKeysType[user_id] = API_KEYS_ID[user_index];
                        return "🔑 Please enter the API key:";
                    }
                }
            } else if (adminInAddingAPIKeys[user_id] === "11") {
                if (user_message.length > 15) {
                    if (API_KEYS_DIC[adminAddingAPIKeysType[user_id]].includes(user_message)) {
                        delete adminInAddingAPIKeys[user_id];
                        return "⚠️ API key already exists!";
                    } else {
                        delete adminInAddingAPIKeys[user_id];
                        API_KEYS_DIC[adminAddingAPIKeysType[user_id]].push(user_message);
                        CURRENT_API_KEY[adminAddingAPIKeysType[user_id]] = user_message;
                        updateApiTxt()
                        return "✅ API key added successfully!";
                    }
                } else {
                    return "⚠️ Invalid API key! Please check and try again.";
                }
            }
        }

        



        if (activeMessages[user_id] > 0) {
            activeMessages[user_id] += 1;
            sendToAllAdmins(`🚨 ${user_id} tried to generate response before previous response is completed!`);
            return "⏳ Please wait until the previous response is completed.";
        } else {
            activeMessages[user_id] += 1;
        }

        

        if (!user_message) {
            sendToAllAdmins(`🚨 *Error Alert!* 🚨\n${user_id} received an empty message error!`)
            return "";
        }


        if (adminHandlingReciptApproval[user_id]) {
            const users_id_list_temp = Object.keys(payment_recipt_sent_by_users);
            
            if (adminHandlingReciptApproval[user_id] === "1") {
                if (Number.isInteger(Number(user_message))) {
                    if (Number(user_message) <= users_id_list_temp.length && Number(user_message) > 0) {
                        let user_index = Number(user_message)-1;
                        let caption2 = `👤 *User:* ${users_id_list_temp[user_index]}\n📋 *Plan:* ${payment_recipt_sent_by_users[users_id_list_temp[user_index]]['plan']}\n💰 *Price:* ${give_currency_type(user_id)} ${PLANS[payment_recipt_sent_by_users[users_id_list_temp[user_index]]['plan']][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}\n📅 *Sent on:* ${payment_recipt_sent_by_users[users_id_list_temp[user_index]]['time']}`;
                        send_image(user_id,payment_recipt_sent_by_users[users_id_list_temp[user_index]]['img_path'],caption2);
                        await sleep(0.5);
                        send_message(user_id, `📊 *User's Current Plan:* ${user_manager[users_id_list_temp[user_index]]['user_plan']}`);
                        await sleep(0.5);
                        adminHandlingReciptApproval[user_id] = "11";
                        if (!upgrading_details_given_by_admin[user_id]) {
                            upgrading_details_given_by_admin[user_id] = [];
                        }
                        upgrading_details_given_by_admin[user_id].push(users_id_list_temp[user_index]);
                        
                        upgrading_details_given_by_admin[user_id].push(payment_recipt_sent_by_users[users_id_list_temp[user_index]]['plan']);
                        //console.log(adminHandlingReciptApproval[user_id]);
                        return "Do you like to approve this user (y/n)?"
                    } else {
                        delete adminHandlingReciptApproval[user_id];
                    }
                } else {
                    delete adminHandlingReciptApproval[user_id];
                }
            } else if (adminHandlingReciptApproval[user_id] === "11") {
                if (user_message.toLowerCase() === "yes" || user_message.toLowerCase() === "y") {
                    let upgrading_user_num = upgrading_details_given_by_admin[user_id][0];
                    let upgrading_plan_name = upgrading_details_given_by_admin[user_id][1];        
                    upgradingThePlan(upgrading_plan_name,upgrading_user_num);
                    delete upgrading_user_temp_admin[user_id];
                    delete upgrading_details_given_by_admin[user_id];
                    delete payment_recipt_sent_by_users[upgrading_user_num];
                    delete adminHandlingReciptApproval[user_id];
                    save_dic_to_json(payment_recipt_sent_by_users,payment_receipt_details_storing_json_file_name);
                    return `✅ User ${upgrading_user_num} has been successfully upgraded to *${PLANS[upgrading_plan_name]['plan_name']}* plan!`;
                } else if (user_message.toLowerCase() === "no" || user_message.toLowerCase() === "n") {
                    let upgrading_user_num = upgrading_details_given_by_admin[user_id][0];
                    let msg2 = `❌ *Your payment receipt has been rejected by our system!*\nUnfortunately, we couldn't verify your payment at this time. If you believe this is an error, please contact the Admin at ${botAdminContactDetails}.\n\nWe appreciate your patience and understanding!`;
                    delete upgrading_user_temp_admin[user_id];
                    delete upgrading_details_given_by_admin[user_id];
                    delete payment_recipt_sent_by_users[upgrading_user_num];
                    delete adminHandlingReciptApproval[user_id];
                    send_message(upgrading_user_num,msg2);
                    save_dic_to_json(payment_recipt_sent_by_users,payment_receipt_details_storing_json_file_name);
                    return `❌ *Receipt was rejected!*\nThe user ${upgrading_user_num} has been notified about this.`;
                } else {
                    delete adminHandlingReciptApproval[user_id];
                }
            }
        }


        if (admin_iniated_to_send_all_users[user_id]) {
            if (admin_iniated_to_send_all_users[user_id] === "1") {
                admin_iniated_to_send_all_users[user_id] = "11";
                admin_iniated_message[user_id] = user_message
                let return_text5 = `📢 *_SEND MESSAGE TO ALL USERS_*\n\nUsers count: ${ALL_USERS_LIST.length}\n\n`;
                return_text5 += `Message:\n${admin_iniated_message[user_id]}\n\nAre you sure you want to send this message to all users? (y/n)\n(Note: This could take up to ${(ALL_USERS_LIST.length) * 0.5} seconds!)`;
                return return_text5;
            } else if (admin_iniated_to_send_all_users[user_id] === "11") {
                delete admin_iniated_to_send_all_users[user_id];
                if (user_message.toLowerCase() === "yes" || user_message.toLowerCase() === "y") {
                    send_message(user_id, `🚀 *Sending your message...*`);
                    let grab_text =  send_a_message_to_all_users(user_id,admin_iniated_message[user_id]);
                    delete admin_iniated_message[user_id];
                    return grab_text
                } else {
                    delete admin_iniated_message[user_id];
                    return "⚠️ *Sending aborted!*";
                }
            }   
        }

        if (userUpgradingPrompts[user_id]) {
            if (userUpgradingPrompts[user_id] === "1") {

                // TESTING VERSION CODES
                if (['yes','yeah','yup','y','ye'].includes(user_message.toLowerCase())) {
                    if (users_wait_list_at_training_period[user_id]) {
                        return "You’ve already joined the waitlist!!\nOnce we officially launch, you’ll receive exclusive bonus offers. Stay tuned! 😊";
                    }
                    users_wait_list_at_training_period[user_id] = [user_name,getDateTime()];
                    delete userUpgradingPrompts[user_id];
                    save_dic_to_json(users_wait_list_at_training_period,users_wait_list_at_training_period_json_file_name);
                    sendToAllAdmins(`User ${user_id} have joined the waitlist 🎉\nWaitlist users count: *${Object.keys(users_wait_list_at_training_period).length}*`);
                    return "🎉 You’ve successfully joined the waitlist! 🚀\nOnce we officially launch, you’ll receive exclusive bonus offers. Stay tuned! 😊";
                }                

                if (PLANS[user_message]) {
                    userIntiatedPlan[user_id] = user_message; 
                    userUpgradingPrompts[user_id] = "11";
                    let return_text3 = `You Choosed: \n *${PLANS[user_message]['plan_name']} ✨*\n\n · 💬 ${PLANS[user_message]['messages']} Messages\n · 💻 ${PLANS[user_message]['chats']} Chats\n · 🖼️ ${PLANS[user_message]['image_analysis']} Image Analyses\n · 🏷️ Price: ${give_currency_type(user_id)} ${PLANS[user_message][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}\n · 🕒 Duration: ${PLANS[user_message]['easy_duration']}`;
                    send_message(user_id,return_text3);
                    await sleep(1);
                    return `✅ *Do you want to proceed with this plan?*  
Reply with *YES* or *NO* (y/n)`
                } else if (['1','2','3','4'].includes(user_message)) {
                    const keys = Object.keys(PLANS);
                    let plan_name_temp = keys[parseInt(user_message)];
                    userIntiatedPlan[user_id] = plan_name_temp;
                    userUpgradingPrompts[user_id] = "11";
                    let return_text3 = `You Choosed: \n *${PLANS[plan_name_temp]['plan_name']}* ✨\n\n · 💬 ${PLANS[plan_name_temp]['messages']} Messages\n · 💻 ${PLANS[plan_name_temp]['chats']} Chats\n · 🖼️ ${PLANS[plan_name_temp]['image_analysis']} Image Analyses\n · 🏷️ Price: ${give_currency_type(user_id)} ${PLANS[plan_name_temp][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}\n · 🕒 Duration: ${PLANS[plan_name_temp]['easy_duration']}`;
                    send_message(user_id,return_text3);
                    await sleep(1);
                    return `✅ *Do you want to proceed with this plan?*  
Reply with *YES* or *NO* (y/n)`
                } else {
                    delete userUpgradingPrompts[user_id];
                }
            } else if (userUpgradingPrompts[user_id] === "11") {
                delete userUpgradingPrompts[user_id];
                if ((user_message.toLowerCase() === "yes" || user_message.toLowerCase() === "y")) {
                    user_payment_recieving_check[user_id] = true;
                    upgradeUsersPendingToSendImages.push(user_id);
                    upgradeUsersPendingToSendImagesTimings.push(getDateTime());
                    sendToAllAdmins(`User *${user_id}* (${user_name}) has initiated the ${PLANS[userIntiatedPlan[user_id]]['plan_name']} Upgrade.\nWhen user sends any image it will be forwarded!`);
                    return `✅ Your request for the *${PLANS[userIntiatedPlan[user_id]]['plan_name']}* has been received.\nPlease transfer the payment to the follwing account.\n\n${transferAccountDetails}\nAmount: ${give_currency_type(user_id)} ${PLANS[userIntiatedPlan[user_id]][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}\n\n💳 Please send your payment proof as an image to proceed.`
                } else {
                    return "Upgrade canceled!"
                }
            }
        }

        if (upgrading_user_temp_admin[user_id]) {
            if (user_message.toLowerCase() === "cancel") {
                delete upgrading_user_temp_admin[user_id];
                console.log("Cancelling promoting...");
                return "Upgrading aborted!"
            }
            if (upgrading_user_temp_admin[user_id] === "1") {
                if (user_message.length === 11 && user_message.startsWith("94")) {
                    upgrading_details_given_by_admin[user_id] = [];
                    upgrading_details_given_by_admin[user_id].push(user_message);
                    upgrading_user_temp_admin[user_id] = "11";
                    let return_text = "Enter the plan needs to be Upgraded\n\n";
                    send_message(user_id, `👤 *User found with the following existing plans:* \n${await send_usage(user_message, "USER")}`);
                    Object.keys(PLANS).forEach((key, index) => {
                        return_text += `${index + 1}. ${PLANS[key]['plan_name']}\n`;
                      });
                    await sleep(0.5);
                    return return_text
                } else {
                    return "⚠️ *Please enter a valid number!*";
                }
            } else if (upgrading_user_temp_admin[user_id] === "11") {
                        if (PLANS[user_message]) {
                            upgrading_details_given_by_admin[user_id].push(user_message);
                            let return_text2 = `🔹 *User Number*: ${upgrading_details_given_by_admin[user_id][0]}\n`;
                            return_text2 += `🔹 *Plan to be Upgraded*: ${upgrading_details_given_by_admin[user_id][1]}\n`;
                            return_text2 += `🔹 *Price*: ${give_currency_type(user_id)} ${PLANS[upgrading_details_given_by_admin[user_id][1]][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}\n`;
                            return_text2 += `\nAre you sure you want to upgrade? (y/n)`;                            
                            upgrading_user_temp_admin[user_id] = "111";
                            return return_text2
                        } else if (['1','2','3','4','5'].includes(user_message)) {
                            const keys = Object.keys(PLANS);
                            let plan_name_temp = keys[parseInt(user_message)-1];
                            upgrading_details_given_by_admin[user_id].push(plan_name_temp);
                            let return_text2 = `🔹 *User Number*: ${upgrading_details_given_by_admin[user_id][0]}\n`;
                            return_text2 += `🔹 *Plan to be Upgraded*: ${upgrading_details_given_by_admin[user_id][1]}\n`;
                            return_text2 += `🔹 *Price*: ${give_currency_type(user_id)} ${PLANS[upgrading_details_given_by_admin[user_id][1]][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}\n`;
                            return_text2 += `\nAre you sure you want to upgrade? (y/n)`; 
                            upgrading_user_temp_admin[user_id] = "111";
                            return return_text2
                        } else {
                            return "⚠️ Please enter a valid plan!";
                        }
                        } else if (upgrading_user_temp_admin[user_id] === "111") {
                            try {
                                if (user_message.toLowerCase() === "yes" || user_message.toLowerCase() === "y") {
                                    let upgrading_user_num = upgrading_details_given_by_admin[user_id][0];
                                    let upgrading_plan_name = upgrading_details_given_by_admin[user_id][1];
                            
                                    // Check if user exists and upgrading plan is valid
                                    if (!user_manager[upgrading_user_num]) {
                                        throw new Error(`User with ID ${upgrading_user_num} not found.`);
                                    }
                                    upgradingThePlan(upgrading_plan_name,upgrading_user_num);
                                    delete upgrading_user_temp_admin[user_id];
                                    delete upgrading_details_given_by_admin[user_id];
                                    return `User ${upgrading_user_num} has been successfully upgraded to the *${PLANS[upgrading_plan_name]['plan_name']}* plan! 🚀`;
                                } else {
                                    delete upgrading_user_temp_admin[user_id];
                                    return "Upgrading canceled!";
                                }
                            } catch (error) {
                                console.error("Error occurred:", error.message);
                                return `An error occurred: ${error.message}`;
                            }
                            
                        }
        }

        if (login_ready_users.includes(user_id)) {
            if (user_message === ADMIN_PASSWORD) {
                authorized_users.push(user_id);
                login_ready_users = login_ready_users.filter(id => id !== user_id);
                return "✅ Access granted! You are now an admin. Welcome aboard! 🎉\nSend 'ADMINCOMMANDS' to view all available Admin commands.";
            } else {


                login_ready_users = login_ready_users.filter(id => id !== user_id);
                return "Wrong password!";
            }
        }

        if (current_bug_reporting.includes(user_id)) {
            const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" });
            const report = `${timestamp} - ${user_id}:\n${user_message}\n\n`;

            try {
                await appendBugReport(bug_reporter_text_path, report);
                current_bug_reporting = current_bug_reporting.filter(id => id !== user_id);
                if (!message.hasMedia){
                    sendToAllAdmins(`🚨 *Bug Report Alert!* 🚨\n\n🛠️ *Reported By:* ${user_id} (${user_name})\n📝 *Bug Details:* ${user_message}\n📅 *Reported On:* ${getDateTime()}\n\n✅ *Status:* Sent to All Admins.`);
                }
                return `✅ Thank you for your bug report, ${user_name}! 🎉\n\nIf your report is validated as a genuine issue, you'll receive *5 additional messages with GPT-4o* as a token of appreciation. Stay tuned and thank you for helping us improve *${BotName}* 🙌`;
            } catch (error) {
                console.error("Error saving bug report:", error);
                sendToAllAdmins(`🚨 *Error Alert!* User ${user_id} faced an issue while submitting a bug report.`);
                return "❌ Oops! Something went wrong while saving your bug report. 😔 Please try again later or contact support if the issue persists.";
            }
        }

        //let commandsPrint = `*NEWCHAT* or *N* - Start a New Chat\n*USAGE* or *U* - Check your Usage\n*BUGREPORT* - Report any bugs you faced`;
        let commandsPrint = `✨ *${BotName} Commands* ✨

1️⃣ *Start a New Chat*  
     🟢 Command: _NEWCHAT_ or _N_

2️⃣ *Check Your Usage*  
     📊 Command: _USAGE_ or _U_

3️⃣ *Report a Bug*  
     🐞 Command: _BUGREPORT_ or _B_

4️⃣ *Upgrade Your Plan*  
     🚀 Command: _UPGRADE_ or _Up_

5️⃣ *View All Plans*  
     💳 Command: _PLANS_ or _P_
     
6️⃣ *Settings*  
     ⚙️ Command: _SETTINGS_ or _S_`;


        // Command handling logic
        const commands = {
            START: () => "Hello, How can I help you today?\nSend COMMANDS or HELP to get all commands you can try!",
            COMMANDS: () => commandsPrint,
            C: () => commandsPrint,
            c: () => commandsPrint,
            HELP: () => `*START* - Start Message\n*NEWCHAT* - Start a New Chat\n*BUGREPORT* - Report any bugs you faced\n*LOGIN* - Login as Admin\nLOGOUT - Logout`,
            LOGIN: () => handleLogin(user_id),
            LOGOUT: () => handleLogout(user_id),
            NEWCHAT: () => handleNewChat(user_id),
            N: () => handleNewChat(user_id),
            n: () => handleNewChat(user_id),
            BUGREPORT: () => handleBugReport(user_id),
            B: () => handleBugReport(user_id),
            b: () => handleBugReport(user_id),
            ADMINCOMMANDS: () => handleAdminCommands(user_id),
            REMAININGAPIS: () => handleREMAININGAPIS(user_id),
            SENDBUGREPORT: () => handleSEND_BUGREPORT(user_id,message),
            USAGE: () => send_usage(user_id,user_name),
            U: () => send_usage(user_id,user_name),
            u: () => send_usage(user_id,user_name),
            CM: () => change_model(user_id),
            Cm: () => change_model(user_id),
            cM: () => change_model(user_id),
            cm: () => change_model(user_id),
            STATS: () => send_chat_history_to_admin(user_id),
            USERS: () => sendAllUsersListToAdmin(user_id),
            USERREPORT: () => sendUserReportToAdmin(user_id,message),
            PROMOTEUSER: () => promoteUserByAdmin(user_id),
            UPGRADE: () => handleUserUpgrade(user_id),
            UP: () => handleUserUpgrade(user_id),
            Up: () => handleUserUpgrade(user_id),
            uP: () => handleUserUpgrade(user_id),
            up: () => handleUserUpgrade(user_id),
            PLANS: () => handlePlanDetails(user_id),
            P: () => handlePlanDetails(user_id),
            p: () => handlePlanDetails(user_id),
            PENDINGUPGRADINGUSERS: () => handlePENDINGUPGRADINGUSERS(user_id),
            UPLOAD: () => handleFILESUPLOAD(user_id),
            ADMINLIST: () => sendAdminsListToAdmin(user_id),
            SENDTOALLUSERS: () => handleSENDTOALLUSERS(user_id),
            RECEIPTSTOREFER:() => handleRECEIPTSTOREFER(user_id),
            INPUTZIP:() => handleINPUTZIP(user_id),
            ADDAPI:() => handleNewADDAPI(user_id),
            WAITLIST:() => handleWAITLIST(user_id),
            SEETINGS:() => handleSETTINGS(user_id,user_name),
            S:() => handleSETTINGS(user_id,user_name),
            s:() => handleSETTINGS(user_id,user_name),
            DELETEUSER:() => handleDELETEUSER(user_id,user_name),
            SENDTOUSER:() => handleSENDTOUSER(user_id),
            RESETDAILYLIMITSMANUALLY:() => handleRESETDAILYLIMITSMANUALLY(user_id),
            PAUSEBOT:() => handlePAUSEBOT(user_id),
            STARTBOT:() => handleSTARTBOT(user_id), //
            SERVERSTATS:() => handleSERVERSTATS(user_id),
        };

        if (commands[user_message]) {
            return commands[user_message]();
        }

        // Call AI response for other messages
        let user_plan_tariff = PLANS[user_manager[user_id]['user_plan']];
        let user_stats = user_manager[user_id];
        if (user_stats['model'] === 0) {
            if (user_stats['messages'] >= user_plan_tariff['messages']){
                save_user_manager(user_manager);
                if (user_stats['chats'] < user_plan_tariff['chats']) {
                    send_message(user_id,"You have reached your limits for 4o-model!\nYou will be getting responses from our next Llama model...")
                    user_stats['model'] = 1;
                    await sleep(0.5);
                    if (user_stats['user_plan'] === 'free-plan') {
                        await sleep(0.5);
                        send_message(user_id,upgrading_limit_reaching_text(user_id));
                    }
                    if (user_message !== "IMAGEANALYSIS_PROGRAM") {
                    user_stats['chats'] += 1;}
                    await sleep(0.5);
                } else {
                    return "⚠️ All your plans have been used up! 😕\nIf you'd like to continue enjoying our services, simply send *UPGRADE* or *Up* to explore new plan options. 🚀";
                }
            } else {
                if (user_message !== "IMAGEANALYSIS_PROGRAM") {
                user_stats['messages'] += 1;}
            }
        } else if (user_stats['model'] === 1) {
            if (user_stats['chats'] >= user_plan_tariff['chats']){
                save_user_manager(user_manager);
                if (user_stats['messages'] < user_plan_tariff['messages']) {
                    send_message(user_id,"You have reached your limits for Llama model!\nYou will be getting responses from our next Llama model...")
                    user_stats['model'] = 0;
                    await sleep(0.5);
                    if (user_message !== "IMAGEANALYSIS_PROGRAM") {
                    user_stats['messages'] += 1;}
                } else {
                    return "⚠️ All your plans have been used up! 😕\nIf you'd like to continue enjoying our services, simply send *UPGRADE* or *Up* to explore new plan options. 🚀";
                }
            } else {
                if (user_message !== "IMAGEANALYSIS_PROGRAM") {
                user_stats['chats'] += 1;}
            }
        }

        let ai_generated_response = await generate_response(user_id, user_message);
        if (containsLatex(ai_generated_response)) {
            send_message(user_id,ai_generated_response);
            await sleep(1.5);
            send_message(user_id,`🔬 Equations detected!\nNeed as image?`);
            users_who_asked_to_send_as_image[user_id] = ai_generated_response;
            return ""
        } else {
            return ai_generated_response;
        }
    } catch (error) {
        console.error("Error in handle_message:", error);
        sendToAllAdmins(`🚨 *Error Alert!* An issue occurred in the "handle message" function while user ${user_id} (${user_name}) attempted an action. Please investigate!`);
        return "An unexpected error occurred. Please try again later. 😔\nIf you'd like to report this issue, send *BUGREPORT* or *B* and we'll look into it!";
    }
}


async function getAudioText(audioFilePath) {
    try {
        const openai = new OpenAI({
            baseURL: BASE_URL_NAMES[1],
            apiKey: CURRENT_API_KEY[API_KEYS_ID[1]]
        });
        const translation = await openai.audio.translations.create({
            file: fs.createReadStream(audioFilePath),
            model: whisper_model_name,
        });
        return "User's Transcribed Audio: "+translation['text']
    } catch (error) {
        // Handle API key rotation for specific errors
        if (error.message.includes("402 status code") || error.message.includes("401") || error.message.includes("429")) {
            // Rotate API key
            if (API_KEYS_DIC[API_KEYS_ID[1]].includes(CURRENT_API_KEY[API_KEYS_ID[1]])) {
                const index = API_KEYS_DIC[API_KEYS_ID[1]].indexOf(CURRENT_API_KEY[API_KEYS_ID[1]]);
                API_KEYS_DIC[API_KEYS_ID[1]].splice(index, 1);
            }
            //updateApiTxt()
            if (API_KEYS_DIC[API_KEYS_ID[1]].length > 0) {
                CURRENT_API_KEY[API_KEYS_ID[1]] = API_KEYS_DIC[API_KEYS_ID[1]][0];
                console.log(`Rotating to the next API key. Remaining keys: ${API_KEYS_DIC[API_KEYS_ID[1]].length}`);
                sendToAllAdmins(`Rotating to the next API key. Remaining keys: ${API_KEYS_DIC[API_KEYS_ID[1]].length}\n\n*Caught Error:* ${error.message}`);
                return await getAudioText(audioFilePath); // Retry with a new key
            } else {
                sendToAllAdmins(`🚨 *Error Alert!* 🚨\nAPI KEYS are Depleted, user ${user_id} encouted the issue!\n\n*Caught Error:* ${error.message}`);
                send_message(user_id,"Error in Audio analyzing, Please try again later.😔\nIf you'd like to report this issue, send *BUGREPORT* or *B* and we'll look into it!");
                return "ERROR"
            }
        } else {
            console.error("Error in generate_response:", error);
        }
        sendToAllAdmins(`🚨 *Error Alert!* 🚨 \nThe user ${user_id} encountered an issue analyzing Audio. Please investigate.\n*Error Message:* ${error}`);
        send_message(user_id,"Error in Audio analyzing, Please try again later.😔\nIf you'd like to report this issue, send *BUGREPORT* or *B* and we'll look into it!");
        return "ERROR"
    }
}

function generateHtmlFromLatex(latexContent, file_name) {
  try {
    // Process the LaTeX content to convert headings and bold text
    const processedContent = latexContent
      // Convert headings (e.g., ## Heading -> <h2>)
      .replace(/(#{1,6})\s*(.+)/g, (match, hashes, text) => {
        const headingLevel = hashes.length; // Heading level based on number of hashes
        return `<h${headingLevel}>${text}</h${headingLevel}>`;
      })
      // Convert **text** to <strong>text</strong>
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Replace line breaks (\n) with <br> tags
      .replace(/\n\n/g, "<br>");

    // Define the HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AJO AI LaTeX Viewer</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js"></script>
      <style>
        body {
          font-family: ui-sans-serif, -apple-system, system-ui, 'Segoe UI', 'Helvetica', 'Apple Color Emoji', 'Arial', sans-serif, 'Segoe UI Emoji', 'Segoe UI Symbol';
          line-height: 1.6;
          margin: 20px;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #0056b3;
          text-align: center;
          margin-bottom: 20px;
        }
        h2, h3, h4, h5, h6 {
          color: #333;
          margin-top: 20px;
        }
        .processed-content {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background-color: #fff;
        }
        pre {
          padding: 10px;
          background-color: #f4f4f4;
          border-left: 4px solid #0056b3;
          overflow-x: auto;
        }
        strong {
          color: #1f4f79;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 0.9em;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>AJO AI LaTeX Viewer</h1>
        <div class="processed-content">
          ${processedContent}
        </div>
      </div>
      <div class="footer">Powered by AJO AI</div>
      <script>
        document.addEventListener("DOMContentLoaded", function () {
          renderMathInElement(document.body, {
            delimiters: [
              { left: "\\\\(", right: "\\\\)", display: false },
              { left: "\\\\[", right: "\\\\]", display: true }
            ]
          });
        });
      </script>
    </body>
    </html>
    `;

    // Write the HTML content to an output.html file
    fs.writeFileSync(file_name, htmlContent);

    console.log(`HTML file '${file_name}' has been created.`);
    return "DONE";
  } catch (error) {
    console.error("An error occurred:", error.message);
    return "ERROR";
  }
}


function containsLatex(input_text) {
    const latexPattern = /\\(begin|end|[a-zA-Z]+\*?)|\\[()[\]]|\\[a-zA-Z]+/;
    return latexPattern.test(input_text);
}

function sendBugReportAppreciation(user_id) {
    if (user_manager[user_id]) {
        user_manager[user_id]['messages'] -= 5;
        save_user_manager(user_manager); // Ensure changes are saved
        send_message(
            user_id,
            "🎉 Congratulations! You've been awarded *5 additional messages* with the 4o model as a token of appreciation for reporting a bug. Thank you for helping us improve!"
        );
    } else {
        sendToAllAdmins(`🚨 *Error Alert!* 🚨\nUser ID ${user_id} not found in user_manager while Trying to give appreciations for bug reporting!`);
        console.error(`User ID ${user_id} not found in user_manager.`);
    }
}

function handleSETTINGS(user_id,user_name) {
    let comms = `Currently under developing, you'll receive it soon via next updates!`;
    comms += ``;
    return comms
}

function upgradingThePlan(upgrading_plan_name,upgrading_user_num) {
    user_manager[upgrading_user_num]['user_plan'] = upgrading_plan_name;
    user_manager[upgrading_user_num]['activation_date'] = getDateTime(); 
    user_manager[upgrading_user_num]['messages'] = 0; 
    user_manager[upgrading_user_num]['chats'] = 0; 
    user_manager[upgrading_user_num]['image_analysis'] = 0; 
    send_message(upgrading_user_num, `🎉 *Congratulations!*  
🚀 You’ve been upgraded to the *${PLANS[upgrading_plan_name]['plan_name']}* plan, and it’s now active!  

🌟 *What’s Next?*  
- 💬 More messages to stay connected effortlessly.  
- 💻 More chats to boost your productivity.  
- 🖼️ Enhanced features to elevate your experience.  

🎁 *Thank you for upgrading!*  
We’re thrilled to have you onboard this journey with us. Let’s achieve amazing things together! 🌟`);
            save_user_manager(user_manager);
}

async function handlePlanDetails(user_id) {
    let plans_display_message = `🌟 *${BotName} Plans* 🌟\n\n`;
    Object.keys(PLANS).forEach((key, index) => {
        plans_display_message += `*${PLANS[key]['plan_name']}*\n · 💬 ${PLANS[key]['messages']} Messages per Day\n · 💻 ${PLANS[key]['chats']} Chats per Day\n · 🖼️ ${PLANS[key]['image_analysis']} Image Analyses per Day\n · 🏷️ Price: ${give_currency_type(user_id)} ${PLANS[key][is_local_user(user_id) ? 'price_LKR' : 'price_USD']}\n · 🕒 Duration: ${PLANS[key]['easy_duration']}\n\n`;
      });
    plans_display_message += `Furthermore, tryout any our early feature as a PAID customer 🚀`;
    send_message(user_id,plans_display_message);
    await sleep(2);
    return "💡 Ready to level up? Reply *UPGRADE* or *UP* to get started!"
}

async function handleUserUpgrade(user_id) {
    // TESTING VERSION CODES
    send_message(user_id,`🎉 We’re currently in the testing phase, and our model will be finalized and officially released on *4th February*. 
We truly appreciate your interest in upgrading your plan! 😊 Would you like to join the *Waitlist* to be among the first to claim our biggest launch offer? 🚀`)
    userUpgradingPrompts[user_id] = "1";
    return ""
    
    let return_text = "";
    Object.keys(PLANS).forEach((key, index) => {
        if (index !== 0){
            return_text += `${index}. ${PLANS[key]['plan_name']} (${give_currency_type(user_id)} ${PLANS[key][is_local_user(user_id) ? 'price_LKR' : 'price_USD']})\n`;
        }
      });
    send_message(user_id,"Thank you for choosing to upgrade 🎉");
    await sleep(0.5);
    send_message(user_id, `✨ *Your Current Plan:* *${PLANS[user_manager[user_id]['user_plan']]['plan_name']}*  

📋 *Choose a Plan to Upgrade:*  
${return_text}  
💬 Just reply with the *number* of the plan you'd like to choose.`);    
        return ""
}

async function change_model(user_id) {
    if (user_manager[user_id]['model']===0) {
        user_manager[user_id]['model'] = 1;
        save_user_manager(user_manager);
        return `Model changed! 🔄\nNow using *Llama Model* 🦙...`;
    } else {
        user_manager[user_id]['model'] = 0;
        save_user_manager(user_manager);
        return `Model changed! 🔄\nNow using *4o Model* 🌟...`;
    }
}

async function send_usage(user_id, user_name) {
    save_user_manager(user_manager);
    isPlanExpired();
    notifyBeforeExpiry();
    let user_stats = user_manager[user_id];
    if (!user_stats) {
        update_user_manager_dictionary(user_id,user_name);
        await sleep(1);
    }
    //console.log(user_id);
    let model_temp_name = user_stats['model'] === 0 ? "4o-model" : "llama-model";
    let user_plan_tariff = PLANS[user_stats['user_plan']];

    // Start preparing the usage message
let statsMessage = `👤 *${user_name}*  
Number: *${user_id}*  

Current Plan: *${PLANS[user_stats['user_plan']]['plan_name']}*  
Model in Use: *${model_temp_name}*  
(Reply 'CM' to switch the model)  

📊 *Your Usage Today:*  
- 💬 *Messages:* ${user_stats['messages']} of ${user_plan_tariff['messages']}  
- 💻 *Chats:* ${user_stats['chats']} of ${user_plan_tariff['chats']}  
- 🖼️ *Image Analyses:* ${user_stats['image_analysis']} of ${user_plan_tariff['image_analysis']}  
`;
    // Calculate and display remaining time if the user is not on a free plan
    if (user_stats['user_plan'] !== 'free-plan') {
        const activationDate = new Date(user_stats['activation_date']);
        const duration = user_plan_tariff.duration;
        const expiryDate = new Date(activationDate);
        expiryDate.setDate(activationDate.getDate() + duration);

        const currentTime = new Date(getDateTime());
        const timeDifference = expiryDate - currentTime;

        if (timeDifference > 0) {
            const remainingDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            const remainingHours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const remainingMinutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

            statsMessage += `\nRemaining Time: ${remainingDays} Day(s) ${remainingHours} Hour(s) ${remainingMinutes} Minute(s)`;
        } else {
            statsMessage += `\nYour plan has expired. Please upgrade to continue enjoying premium features.`;
        }
    }

    return statsMessage;
}


function handleDELETEUSER(user_id,user_name) {
    if (authorized_users.includes(user_id)) {
        adminInDeletingUser[user_id] = "1";
        return "Enter the number you want to delete:"
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}


function handleRESETDAILYLIMITSMANUALLY(user_id) {
    if (authorized_users.includes(user_id)) {
        resetDailyLimits(user_id);
        return ""
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

function handleINPUTZIP(user_id) {
    if (authorized_users.includes(user_id)) {
        adminInIputingZIP[user_id] = "1";
        return "Please send me the Files ZIP...";
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

async function handleZipSavingAndExtracting(user_id,message) {
    try {
        delete adminInIputingZIP[user_id];
        const media = await message.downloadMedia();
        const path = "Files.zip";
        const buffer = Buffer.from(media.data, 'base64');
        fs.writeFileSync(path, buffer);
        send_message(user_id, "ZIP File saved successfully!\nExtracting...");
        deleteFolder("Files");
        await sleep(1);
        extractZip(path);
        await sleep(5);
        user_manager, chatHistory, payment_recipt_sent_by_users, users_wait_list_at_training_period = startup_runners();
        await sleep(1);
        return `✅ All fixed! \n${ALL_USERS_LIST.length} pre-users found in your new files zip! 📦`;
    } catch (error) {
        sendToAllAdmins(`🚨 *Error Alert!* 🚨\nAn error occurred in the function _handleZipSavingAndExtracting_ on ${getDateTime()} while the ADMIN ${user_id} was sending a the files.zip. Please investigate.\n\n*Error Message:* ${error}`);
        return "An Error occuered!"
    }
}

function extractZip(zipFilePath) {
    const currentDirectory = process.cwd();
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: currentDirectory }))
      .on('close', () => console.log(`Extraction complete: '${zipFilePath}' to '${currentDirectory}'`))
      .on('error', (error) => console.error(`Error: ${error.message}`));
  }

function deleteFolder(folderPath) {
    if (fs.existsSync(folderPath)) {
      fs.readdirSync(folderPath).forEach((file) => {
        const currentPath = path.join(folderPath, file);
        if (fs.lstatSync(currentPath).isDirectory()) {
          deleteFolder(currentPath); // Recursively delete contents
        } else {
          fs.unlinkSync(currentPath); // Delete file
        }
      });
      fs.rmdirSync(folderPath); // Delete the empty folder
      console.log(`Folder '${folderPath}' has been deleted.`);
    } else {
      console.log(`Folder '${folderPath}' does not exist.`);
    }
  }

// Function to zip a folder
async function zipFolder(sourceFolder, zipFilePath) {
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Compression level
  });

  // Handle archive events
  output.on('close', () => {
    console.log(`Zip file created: ${zipFilePath}, ${archive.pointer()} total bytes`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output); // Pipe the archive data to the output file
  archive.directory(sourceFolder, true); // Include the folder itself in the zip
  archive.finalize(); // Finalize the archive
}

async function send_file(user_id, zip_path) {
    try {
        // Ensure the file exists
        if (!fs.existsSync(zip_path)) {
            console.error('File does not exist:', zip_path);
            return;
        }

        // Create a MessageMedia instance from the file path
        
        const media = MessageMedia.fromFilePath(zip_path);

        // Send the media to the specified user
        await client.sendMessage(user_id + "@s.whatsapp.net", media);
    } catch (error) {
        sendToAllAdmins(`🚨 *Error Alert!* 🚨\nAn error occured while sending the file _${zip_path}_ to ${user_id}.\n\n*Caught Error:* ${error.message}`);
        send_message(user_id, "❌ Oops! An Error occured while sending the file!. Please try again in a moment! 😔");
    }
}

async function handleFILESUPLOAD(user_id) {
    if (authorized_users.includes(user_id)) {
        send_message(user_id, "⏳ Please wait, I'm generating the Files ZIP!");
        await sleep(1);
        let zip_path = `${mainDirName}.zip`;
        await zipFolder(mainDirName, zip_path);
        await sleep(1);
        send_file(user_id, zip_path);
        sendToAllAdmins(`👑 Admin ${user_id} has requested the Files ZIP`);
        return "🎉 Your Files ZIP is ready! Here it is. 📦";
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

function handleSENDTOUSER(user_id) {
    if (authorized_users.includes(user_id)) {
        adminInSendingMessageToOneUser[user_id] = "1";
        return `📲 Enter the number:`;
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

function handlePAUSEBOT(user_id) {
    if (authorized_users.includes(user_id)) {
        if (isBotPaused === false) {
            isBotPaused = true;
            return "⏸️ Bot paused successfully! All Users are on pause, *except Admins*!";
        } else {
            return "⏸️ Bot is already Paused!\nSend *STARTBOT* to start the Bot again!";
        }
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

function handleSTARTBOT(user_id) {
    if (authorized_users.includes(user_id)) {
        if (isBotPaused === true) {
            isBotPaused = false;
            return "▶️ Bot Started successfully!";
        } else {
            return "▶️ Bot is already running!\nSend *PAUSEBOT* to pause the Bot!";
        }
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

function createLimitedList(maxSize = 50) {
    const list = [];
    return {
        // Function to append a single sublist or another list of sublists
        append(value) {
            if (Array.isArray(value[0])) {
                // If the value is an array of sublists, iterate through it
                for (const item of value) {
                    if (list.length >= maxSize) {
                        list.shift(); // Remove the oldest entry if the list exceeds max size
                    }
                    list.push(item);
                }
            } else {
                // If the value is a single sublist, add it directly
                if (list.length >= maxSize) {
                    list.shift(); // Remove the oldest entry if the list exceeds max size
                }
                list.push(value);
            }
        },

        // Function to read the current list
        read() {
            return [...list]; // Return a copy of the list
        }
    };
}

function getDateTime() {
    const now = new Date();
    const options = {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);

    let dateParts = { year: '', month: '', day: '', hour: '', minute: '', second: '', period: '' };

    parts.forEach(({ type, value }) => {
        switch (type) {
            case 'year':
                dateParts.year = value;
                break;
            case 'month':
                dateParts.month = value;
                break;
            case 'day':
                dateParts.day = value;
                break;
            case 'hour':
                dateParts.hour = value;
                break;
            case 'minute':
                dateParts.minute = value;
                break;
            case 'second':
                dateParts.second = value;
                break;
            case 'dayPeriod':
                dateParts.period = value;
                break;
            default:
                break;
        }
    });

    return `${dateParts.year}-${dateParts.month}-${dateParts.day} ${dateParts.hour}:${dateParts.minute}:${dateParts.second} ${dateParts.period}`;
}

// send_chat_history_to_admin
// send_chat_history_to_admin
async function send_chat_history_to_admin(user_id) {
    if (authorized_users.includes(user_id)) {
        let var1 = `*_Last 50 chats with BOT_*\n\n`;
        let lss = chatHistory.read(); // Read the chat history list
        let count_amount = lss.length; // Get the current count of items

        for (let i = 0; i < count_amount; i++) { // Start from index 0
            const entry = lss[i]; // Get the current entry

            if (entry && entry.length >= 3) { // Ensure the entry is valid and has enough data
                let user_mess = entry[2].replace(/\n/g, ' ');
                if (user_mess.length > 20) {
                    user_mess = user_mess.substring(0, 20) + "..."; // Truncate long messages
                }
                var1 += `${i + 1}. ${entry[0]}, ${entry[1]}\n   ${user_mess}\n`;
            }
        }
        return var1;
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

async function handlePENDINGUPGRADINGUSERS(user_id) {
    if (authorized_users.includes(user_id)) {
        if (upgradeUsersPendingToSendImages.length === 0) {
            return "🚫 No users have initiated an upgrade at the moment!";
        }
        let return_text4 = "*🔄 Users Who Have Initiated Upgrade Requests:* \n\n";
        for (let i = 0; i < upgradeUsersPendingToSendImages.length; i++) { // Start from index 0
            return_text4 += `${i + 1}) ${upgradeUsersPendingToSendImages[i]} (${upgradeUsersPendingToSendImagesTimings[i]})\n`;
        }
        return return_text4
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}

async function sendToAllAdmins(message_text) {
    message_text += `\n(This message has sent to all Admins)`;
    for (const admin_id_temp of authorized_users) {
        send_message(admin_id_temp, message_text);
        await sleep(1);
    }
}

async function sendUserReportToAdmin(user_id,message) {
    if (authorized_users.includes(user_id)) { //user_report_pdf_name
        save_user_manager(user_manager);
        send_message(user_id, "⏳ Please wait, I'm generating!");
        createPDF(user_manager);
        await sleep(1);
        createPDF(user_manager);
        await sleep(1);
        const media = new MessageMedia('application/pdf', fs.readFileSync(user_report_pdf_name).toString('base64'), path.basename(user_report_pdf_name));
            try {
                await client.sendMessage(message.from, media);
                console.log(`User report sent to ADMIN - ${user_id} successfully!`);
                return ""
            } catch (err) {
                console.error(`Error sending User report to ${user_id}:`, err);
                return "An Error occured while sending file. Try again shortly!"
            }
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}


    
async function sendAllUsersListToAdmin(user_id) {
    if (authorized_users.includes(user_id)) {
        let var2 = `*📜 _Users List:_* \n\n`;
        
        for (let i = 0; i < ALL_USERS_LIST_with_user_name.length; i++) { // Start from index 0
            var2 += `${i + 1}. ${ALL_USERS_LIST_with_user_name[i]}\n`; 
        }
        return var2
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
} 


async function handleWAITLIST(user_id) {
    if (authorized_users.includes(user_id)) {
        let return_text6 = "*🧾 _Waitlisted Users:_*\n\n";
        const users_id_list_temp = Object.keys(users_wait_list_at_training_period);
        if (users_id_list_temp.length === 0) {
            return "⚠️ No users have joined waitlist yet!";
        }
        for (let i = 0; i < users_id_list_temp.length; i++) {
            let temp_user_name = users_wait_list_at_training_period[users_id_list_temp[i]][0];
            let temp_time = users_wait_list_at_training_period[users_id_list_temp[i]][1];
            return_text6 += `${i + 1}. ${temp_user_name} (${users_id_list_temp[i]})\nIniated at: ${temp_time}\n`;
        }
        return return_text6
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
} 


// Function to calculate folder size
function getFolderSize(folderPath) {
    let totalSize = 0;
    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            totalSize += stats.size;
        } else if (stats.isDirectory()) {
            totalSize += getFolderSize(filePath);
        }
    });

    return totalSize;
}

// Function to get CPU usage percentage
function getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;

    cpus.forEach(cpu => {
        for (type in cpu.times) {
            totalTick += cpu.times[type];
        }     
        totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;

    return ((1 - idle / total) * 100).toFixed(2); // CPU usage percentage
}

// Main stats function
function getServerStats() {
    // RAM usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedMemPercentage = ((usedMem / totalMem) * 100).toFixed(2);

    // Folder size
    const folderPath = './Files';  // Update to your main directory path
    const folderSize = getFolderSize(folderPath) / (1024 * 1024);  // Size in MB

    // CPU usage
    const cpuUsage = getCpuUsage();

    // Return stats
    return {
        memoryUsage: `${(usedMem / (1024 * 1024)).toFixed(2)} MB (${usedMemPercentage}%)`,
        folderSize: `${folderSize.toFixed(2)} MB`,
        cpuUsage: `${cpuUsage}%`
    };
}

function handleSERVERSTATS(user_id) {
    if (authorized_users.includes(user_id)) {
        const stats = getServerStats();
        return `📊  *Server Stats*  📊
        \n🖥️ *RAM Usage*: ${stats.memoryUsage}\n📂 *Files Directory Size*: ${stats.folderSize}\n💻 *CPU Usage*: ${stats.cpuUsage}`;
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
}


async function sendAdminsListToAdmin(user_id) {
    if (authorized_users.includes(user_id)) {
        let var2 = `*👑 _Admins List:_* \n\n`;
        
        for (let i = 0; i < authorized_users.length; i++) { // Start from index 0
            var2 += `${i + 1}. ${authorized_users[i]}\n`;
            
        }
        return var2
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
} 

async function handleSENDTOALLUSERS(user_id) {
    if (authorized_users.includes(user_id)) {
        admin_iniated_to_send_all_users[user_id] = "1";
        return "Please type in the message you want to send..."
    } else {
        return "🚫 You're not an admin. Please LOGIN and try again!";
    }
} 

async function send_a_message_to_all_users(user_id,message_text2) {
    try {
        if (authorized_users.includes(user_id)) {
            for (const user_id_temp of ALL_USERS_LIST) {
                try {
                    await send_message(user_id_temp, message_text2);
                } catch (error) {
                    send_message(user_id, `❌ Failed to send message to user ${user_id_temp}: ${error.message}`);
                    console.error(`Failed to send message to user ${user_id_temp}:`, error.message);
                }
                await sleep(0.5);
            }
            return "Message sent to All users";
        } else {
            return "🚫 You're not an admin. Please LOGIN and try again!";
        }
    } catch (mainError) {
        console.error("An unexpected error occurred:", mainError.message);
        return "❗ An error occurred while sending messages. Please try again later.";
    }
}

async function handleNewADDAPI(user_id) {
    if (authorized_users.includes(user_id)) {
        let commands3 = `🔑 *Which API key would you like to add?*\n`;
        Object.keys(API_KEYS_TEXT_FILES).forEach((key, index) => {
            commands3 += `${index+1}. ${key}\n`;
        });
        commands3 += `Enter the number...`;
        adminInAddingAPIKeys[user_id] = "1";
        return commands3;
    } else {
        return "You are not an admin. LOGIN and try.";
    }
}


async function handleREMAININGAPIS(user_id, user_input) {
        if (authorized_users.includes(user_id)) {
            let commands2 = "*🔑 Remaining API Keys:* \n\n";
            console.log(API_KEYS_ID);
            API_KEYS_ID.forEach(apiId => {
                commands2 += `*${apiId}* - ${API_KEYS_DIC[apiId].length} keys are remaining\n`;
            });
            return commands2.slice(0, -1);
        } else {
            return "You are not an admin. LOGIN and try.";
        }
    }

async function handleSEND_BUGREPORT(user_id,message) {
        if (authorized_users.includes(user_id)) {
            const media = new MessageMedia('text/plain', fs.readFileSync(bug_reporter_text_path).toString('base64'), path.basename(bug_reporter_text_path));
            try {
                await client.sendMessage(message.from, media);
                console.log(`Log file sent to ADMIN - ${user_id} successfully!`);
                return ""
            } catch (err) {
                console.error('Error sending file:', err);
                return "An Error occured while sending file. Try again shortly!"
            }
        } else {
            return "You are not an admin. LOGIN and try.";
        }
    }

async function handleRECEIPTSTOREFER(user_id) {
        if (authorized_users.includes(user_id)) {
            let return_text6 = "*🧾 _Users' Receipt Details:_*\n\n";
            const users_id_list_temp = Object.keys(payment_recipt_sent_by_users);

            if (users_id_list_temp.length === 0) {
                return "⚠️ No users have sent receipts!";
            }

            for (let i = 0; i < users_id_list_temp.length; i++) {
                return_text6 += `${i + 1}. *Sent On:* ${payment_recipt_sent_by_users[users_id_list_temp[i]]['time']}\n`;
                return_text6 += `   *User:* ${users_id_list_temp[i]}\n   *Plan:* ${payment_recipt_sent_by_users[users_id_list_temp[i]]['plan']}\n\n`;
            }
            adminHandlingReciptApproval[user_id] = "1";
            return return_text6.slice(0, -2)
        } else {
            return "You are not an admin. LOGIN and try.";
        }
    }

async function handleAdminCommands(user_id) {
    // Check if the user input is "ADMINCOMMANDS"

        // Verify if the user is authorized
        if (authorized_users.includes(user_id)) {
            const commands = `⚙️ *_ADMIN COMMANDS_*\n
 · *REMAININGAPIS* - check remaining API keys
 · *ADDAPI* - add a new API key
 · *SENDBUGREPORT* - get bug report
 · *STATS* - Check last 50 Prompts
 · *USERS* - to check all users
 · *USERREPORT* - Send User Report
 · *ADMINLIST* - Send all the Admins
 · *PROMOTEUSER* - Upgrade a user
 · *PENDINGUPGRADINGUSERS* - User list who initiated Upgrade
 · *SENDTOALLUSERS* - Send a Message to All users
 · *RECEIPTSTOREFER* - Receipt to be refered and upgraded
 · *DELETEUSER* - Delete a user from database.
 · *UPLOAD* - Upload the ZIP file with All Documents.
 · *INPUTZIP* - Input the new Files zip to use it.
 · *SENDTOUSER* - Send a message to a particular user.
 · *RESETDAILYLIMITSMANUALLY* - Reset the limits manually.
 · *PAUSEBOT* - Pause the bot functionality for all except Admins.
 · *STARTBOT* - Start the bot functionality for all again. 
 · *SERVERSTATS* - Check server stats (CPU, RAM, STORAGE) 
 · *WAITLIST* - Users who entered Waitlist _(Testing version)_`;
            return commands;
        } else {
            return "You are not an admin. LOGIN and try.";
        }
    }


async function promoteUserByAdmin(user_id) {
        if (authorized_users.includes(user_id)) {
            upgrading_user_temp_admin[user_id] = "1";
            send_message(user_id, "You can send 'cancel' at any time to stop the upgrade process.");
            return "📲 Please enter the phone number of the user you want to upgrade.";
        } else {
            return "You are not an admin. LOGIN and try.";
        }
    }


async function scrapePage(url) {
        const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Reduces memory usage in Docker environments
      "--disable-gpu", // Disable GPU acceleration (useful for CI/CD)
    ],
    headless: true,
  });  // Launch in headless mode  // Launch in headless mode
        const page = await browser.newPage();
        await page.goto(url);
    
        // Extract content
        const text = await page.evaluate(() => {
            return document.body.innerText;  // Extracts visible text from the <body> tag
        });
    
        await browser.close();
        return text.slice(200, 2500);  // Return text from 200th to 2500th character
    }
    
    function checkMessageContent(user_id) {
        return !user_chat_history[user_id].some(
            (message) => Array.isArray(message.content) && message.content.some(item => typeof item === 'object')
        );
    }
    

async function generate_response(user_id, user_message) {
    try {
        if (!user_chat_history[user_id]) {
            user_chat_history[user_id] = [];
        }

        // Append the user's message to the chat history
        if (user_message !== "IMAGEANALYSIS_PROGRAM") {
            user_chat_history[user_id].push({ role: "user", content: user_message });
        }

        //console.log(`BaseURL: ${BASE_URL_NAMES[user_manager[user_id]['model']]}\nAPI: ${CURRENT_API_KEY[API_KEYS_ID[user_manager[user_id]['model']]]}\nMOdelName: ${OUR_MODEL_NAMES[user_manager[user_id]['model']]}`)

        // Prepare OpenAI instance
        const openai = new OpenAI({
            baseURL: BASE_URL_NAMES[user_manager[user_id]['model']],
            apiKey: CURRENT_API_KEY[API_KEYS_ID[user_manager[user_id]['model']]],
        });

        // Include the system message and last 7 messages in the request
        const last_7_messages = user_chat_history[user_id].slice(-7);

        //console.log(last_7_messages)

        if (checkMessageContent(user_id) ) {
            last_7_messages.unshift({
                role: "system",
                content: `Your name is ${BotName} and you're Whatsapp based AI capable with image analysis and web searching and capable to reply to whatsapp voice messages`
            });
            last_7_messages.unshift({
                role: "system",
                content: "You're a friendly assitant"
            });
            last_7_messages.unshift({
                role: "system",
                content: `Current Date: ${getDateTime()}.If I ask about something related to *current* or *real-time* or *if you dont know current details about the topic* or *do you think its need to be searched to provide better results user expects*, and if it requires searching, ONLY THEN respond with this format: 'https://www.google.com/search?q=..'. Don't provide any additional when there's need a google search. I will then provide the results for you to summarize or process further.`
            });
        }

        //console.log(messages);
        //console.log(">",last_7_messages);
        // Request completion from the API
        const completion = await openai.chat.completions.create({
            messages: last_7_messages,
            model: OUR_MODEL_NAMES[user_manager[user_id]['model']],
        });
        //console.log("AI:", completion.choices[0].message.content); // Log the actual response content
        let responseContent = completion.choices[0].message.content || "Sorry, I couldn't process your request.";
        
        const tokensUsed = {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
        };

        console.log(
            user_id,
            "=>",
            `${user_message.slice(0, 20).replace(/\n/g, ' ')}...`,
            "=> Tokens used:",
            tokensUsed.promptTokens,
            tokensUsed.completionTokens
        );

        // Check for real-time search URL in the response
        const extracted_url = responseContent.match(/(https:\/\/www\.google\.com\/[^\s]+)/g)?.[0];
        if (extracted_url) {
            await send_message(user_id, "🌐 Searching on Web...")
            try {
                const pageContent = await scrapePage(extracted_url);

                // Sanitize the scraped content
                const sanitizedContent = sanitizeContent(pageContent);

                // If valid content is obtained, recursively call generate_response
                if (sanitizedContent) {
                    responseContent = await generate_response(user_id, "Accurate Information Results Here. Process and summarize this information naturally: "+sanitizedContent);
                } else {
                    responseContent = "Unable to process real-time data. Please try again later.";
                }
            } catch (error) {
                console.error("Error while processing real-time data:", error);
                responseContent = "Unable to fetch real-time data. Please try again later.";
            }
        }

        // Append the assistant's response to the chat history
        user_chat_history[user_id].push({ role: "assistant", content: responseContent });

        // Save All Chats
        if (!ALL_CHAT_HISTORY[user_id]) {
            ALL_CHAT_HISTORY[user_id] = [];
        }
        ALL_CHAT_HISTORY[user_id].push(`(${getDateTime()})>>> User: ${user_message}\n\n`);
        ALL_CHAT_HISTORY[user_id].push(`(${getDateTime()})>>> Assistant: ${responseContent}\n\n`);
        return responseContent;
    } catch (error) {

        // Handle API key rotation for specific errors
        if (error.message.includes("402 status code") || error.message.includes("401") || error.message.includes("429")) {
            // Rotate API key
            if (API_KEYS_DIC[API_KEYS_ID[user_manager[user_id]['model']]].includes(CURRENT_API_KEY[API_KEYS_ID[user_manager[user_id]['model']]])) {
                const index = API_KEYS_DIC[API_KEYS_ID[user_manager[user_id]['model']]].indexOf(CURRENT_API_KEY[API_KEYS_ID[user_manager[user_id]['model']]]);
                API_KEYS_DIC[API_KEYS_ID[user_manager[user_id]['model']]].splice(index, 1);
            }
            //updateApiTxt()
            if (API_KEYS_DIC[API_KEYS_ID[user_manager[user_id]['model']]].length > 0) {
                CURRENT_API_KEY[API_KEYS_ID[user_manager[user_id]['model']]] = API_KEYS_DIC[API_KEYS_ID[user_manager[user_id]['model']]][0];
                console.log(`Rotating to the next API key. Remaining keys: ${API_KEYS_DIC[API_KEYS_ID[user_manager[user_id]['model']]].length}`);
                sendToAllAdmins(`Rotating to the next API key. Remaining keys: ${API_KEYS_DIC[API_KEYS_ID[user_manager[user_id]['model']]].length}\n\n*Caught Error:* ${error.message}`);
                return await generate_response(user_id, user_message); // Retry with a new key
            } else {
                sendToAllAdmins(`🚨 *Error Alert!* 🚨\nAPI KEYS are Depleted, user ${user_id} encouted the issue!\n\n*Caught Error:* ${error.message}`);
                return "Error in generating response, Please try again later.😔\nIf you'd like to report this issue, send *BUGREPORT* or *B* and we'll look into it!";
            }
        } else if (error.message.includes("400 Too many images provided.  This model supports up to 1 images")) {
            user_manager[user_id]['image_analysis'] -= 1;
            return `⚠️ The current model *Llama* supports only 1 image per chat.\n✨ Please try again by starting a new chat or switch to the *4o Model* for more flexibility! 🌟`;
        } else {
            console.error("Error in generate_response:", error);
        }
        sendToAllAdmins(`🚨 *Error Alert!* 🚨 \nThe user ${user_id} encountered an issue while generating a response from the AI. Please investigate.\n*Error Message:* ${error}`);
        return "An error occurred while generating the response.";
    }
}

// Function to save chat history
function saveAllChatsToFile(chatHistory) {
    for (const user_id in chatHistory) {
        const fileName = `${allUserChatsDir}/${user_id}_chats.txt`;
        const chatContent = chatHistory[user_id].join('');
        
        // Append to the file if it exists, otherwise create a new file
        fs.appendFile(fileName, chatContent, (err) => {
            if (err) {
                console.error(`Failed to save chat for ${user_id}:`, err);
            } else {
                delete chatHistory[user_id];
                //console.log(`Chat history for ${user_id} saved to ${fileName}`);
            }
        });
    }
}
    
// Helper function to sanitize content
function sanitizeContent(content) {
    if (typeof content !== 'string' || !content.trim()) {
        return null;
    }
    // Remove unnecessary characters and limit content length
    return content.replace(/[^a-zA-Z0-9 .,!?]/g, '').trim().slice(0, 2000); // Limit to 2000 characters
}


async function send_message(user_id, message) {
    try {
        // Sends a message to the user identified by user_id
        await client.sendMessage(user_id + "@s.whatsapp.net", message);
        //console.log(`Message sent to ${user_id}: ${message}`);
    } catch (error) {
        // sendToAllAdmins(`🚨 *Error Alert!* An error occured in the _send_message_ function while trying to send to ${user_id}!`);
        console.error(`Error sending message to ${user_id}:`, error);
    }
}



async function send_image(user_id, imgPath, caption = '') {
    try {
        // Ensure the file exists
        if (!fs.existsSync(imgPath)) {
            throw new Error(`File not found: ${imgPath}`);
        }

        // Determine MIME type based on file extension
        const mimeType = mime.lookup(imgPath);
        if (!mimeType || !mimeType.c('image/')) {
            throw new Error(`Invalid image file type: ${imgPath}`);
        }

        // Read and encode the image as base64
        const imageBase64 = fs.readFileSync(imgPath).toString('base64');

        // Create a MessageMedia object
        const media = new MessageMedia(mimeType, imageBase64, path.basename(imgPath));``

        // Send the image with a caption
        await client.sendMessage(user_id + '@s.whatsapp.net', media, { caption });
        //console.log(`Image sent to ${user_id} with caption: "${caption}"`);
    } catch (error) {
        console.error(`Error sending image to ${user_id}:`, error);
    }
}



async function appendBugReport(BugReportTempfilePath, report) {
    try {
        fs.appendFileSync(BugReportTempfilePath, report, 'utf8');
        //console.log("Bug report saved.");
    } catch (error) {
        console.error("Error appending bug report:", error);
        throw error;
    }
}

function handleLogin(user_id) {
    if (authorized_users.includes(user_id)) {
        return "🔑 You are already authenticated as an admin! \nSend 'ADMINCOMMANDS' to view all admin commands.";
    } else {
        login_ready_users.push(user_id);
        return "🔒 Please enter the admin password to proceed.";
    }
}

function handleLogout(user_id) {
    if (authorized_users.includes(user_id)) {
        authorized_users = authorized_users.filter(id => id !== user_id);
        return "✅ You have successfully logged out!";
    } else {
        return "⚠️ You are not logged in. Please send 'LOGIN' to log in.";
    }
}


async function handleNewChat(user_id) {
    if (user_chat_history[user_id]) {
        delete user_chat_history[user_id];
        console.log("Cleared chat history for user:", user_id);
        send_message(user_id,"🧹 Clearing old chats and starting a new chat...");
        await sleep(1.5);
        send_message(user_id,"Hello! How can I assist you today?");
        return "";
    }
    send_message(user_id,"💬 Starting a new chat...");
    await sleep(1);
    send_message(user_id,"Hello! How can I assist you today?");
    return "";
}

function handleBugReport(user_id) {
    current_bug_reporting.push(user_id);
    return "📝 Please describe the issue you encountered. You can also include an image and mention the issue in the caption.";
}
